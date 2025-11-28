import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ========== ASSET CATEGORIES ==========

router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM account_asset_category ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== ASSETS ==========

// Get all assets
router.get('/', async (req, res) => {
  try {
    const { category_id, state, search } = req.query;
    let query = `
      SELECT a.*, 
             c.name as category_name,
             p.name as partner_name,
             u.name as custodian_name
      FROM account_asset a
      LEFT JOIN account_asset_category c ON a.category_id = c.id
      LEFT JOIN partners p ON a.partner_id = p.id
      LEFT JOIN users u ON a.custodian_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (category_id) {
      query += ` AND a.category_id = $${paramCount++}`;
      params.push(category_id);
    }

    if (state) {
      query += ` AND a.state = $${paramCount++}`;
      params.push(state);
    }

    if (search) {
      query += ` AND (a.name ILIKE $${paramCount} OR a.code ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY a.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get asset by ID with depreciation history
router.get('/:id', async (req, res) => {
  try {
    const assetResult = await pool.query(
      `SELECT a.*, 
              c.name as category_name,
              p.name as partner_name,
              u.name as custodian_name
       FROM account_asset a
       LEFT JOIN account_asset_category c ON a.category_id = c.id
       LEFT JOIN partners p ON a.partner_id = p.id
       LEFT JOIN users u ON a.custodian_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Get depreciation history
    const depreciationResult = await pool.query(
      `SELECT * FROM account_asset_depreciation 
       WHERE asset_id = $1 
       ORDER BY period_start DESC`,
      [req.params.id]
    );

    // Get disposal info if exists
    const disposalResult = await pool.query(
      'SELECT * FROM account_asset_disposal WHERE asset_id = $1',
      [req.params.id]
    );

    res.json({
      ...assetResult.rows[0],
      depreciation_history: depreciationResult.rows,
      disposal: disposalResult.rows[0] || null,
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create asset
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      category_id,
      partner_id,
      purchase_date,
      purchase_value,
      salvage_value,
      useful_life_years,
      location,
      custodian_id,
      currency_id,
      notes,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO account_asset 
       (name, code, category_id, partner_id, purchase_date, purchase_value, current_value, 
        salvage_value, useful_life_years, location, custodian_id, currency_id, notes, state)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11, $12, 'draft')
       RETURNING *`,
      [
        name,
        code || null,
        category_id,
        partner_id || null,
        purchase_date,
        purchase_value,
        salvage_value || 0,
        useful_life_years,
        location || null,
        custodian_id || null,
        currency_id || null,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating asset:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Asset code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Run depreciation for asset
router.post('/:id/depreciate', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const assetId = req.params.id;
    const { period_start, period_end } = req.body;

    // Get asset
    const assetResult = await client.query(
      'SELECT * FROM account_asset WHERE id = $1',
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = assetResult.rows[0];

    if (asset.state !== 'open') {
      return res.status(400).json({ error: 'Asset is not in open state' });
    }

    // Calculate depreciation (straight-line method)
    const depreciableValue = asset.current_value - asset.salvage_value;
    const monthlyDepreciation = depreciableValue / (asset.useful_life_years * 12);

    // Get last depreciation to calculate accumulated
    const lastDepResult = await client.query(
      `SELECT accumulated_depreciation, book_value 
       FROM account_asset_depreciation 
       WHERE asset_id = $1 
       ORDER BY period_end DESC 
       LIMIT 1`,
      [assetId]
    );

    let accumulatedDepreciation = 0;
    let bookValue = asset.purchase_value;

    if (lastDepResult.rows.length > 0) {
      accumulatedDepreciation = parseFloat(lastDepResult.rows[0].accumulated_depreciation || 0);
      bookValue = parseFloat(lastDepResult.rows[0].book_value || asset.current_value);
    }

    const newAccumulated = accumulatedDepreciation + monthlyDepreciation;
    const newBookValue = Math.max(bookValue - monthlyDepreciation, asset.salvage_value);

    // Create depreciation record
    const depResult = await client.query(
      `INSERT INTO account_asset_depreciation 
       (asset_id, period_start, period_end, depreciation_amount, accumulated_depreciation, book_value, state)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [assetId, period_start, period_end, monthlyDepreciation, newAccumulated, newBookValue]
    );

    // Update asset current value
    await client.query(
      'UPDATE account_asset SET current_value = $1 WHERE id = $2',
      [newBookValue, assetId]
    );

    await client.query('COMMIT');

    res.status(201).json(depResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error running depreciation:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

// Dispose asset
router.post('/:id/dispose', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const assetId = req.params.id;
    const { disposal_date, disposal_type, disposal_value, notes } = req.body;

    // Get asset
    const assetResult = await client.query(
      'SELECT * FROM account_asset WHERE id = $1',
      [assetId]
    );

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const asset = assetResult.rows[0];

    if (asset.state !== 'open') {
      return res.status(400).json({ error: 'Asset is not in open state' });
    }

    // Calculate gain/loss
    const gainLoss = parseFloat(disposal_value || 0) - asset.current_value;

    // Create disposal record
    const disposalResult = await client.query(
      `INSERT INTO account_asset_disposal 
       (asset_id, disposal_date, disposal_type, disposal_value, gain_loss, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [assetId, disposal_date, disposal_type, disposal_value || 0, gainLoss, notes || null]
    );

    // Update asset state
    await client.query(
      "UPDATE account_asset SET state = 'removed' WHERE id = $1",
      [assetId]
    );

    await client.query('COMMIT');

    res.status(201).json(disposalResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error disposing asset:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router;

