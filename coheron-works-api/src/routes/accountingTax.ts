import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ========== TAX GROUPS ==========

router.get('/groups', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM account_tax_group WHERE active = true ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tax groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== TAXES ==========

// Get all taxes
router.get('/', async (req, res) => {
  try {
    const { type_tax_use, country_id, active } = req.query;
    let query = `
      SELECT t.*, tg.name as tax_group_name
      FROM account_tax t
      LEFT JOIN account_tax_group tg ON t.tax_group_id = tg.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (type_tax_use) {
      query += ` AND t.type_tax_use = $${paramCount++}`;
      params.push(type_tax_use);
    }

    if (country_id) {
      query += ` AND t.country_id = $${paramCount++}`;
      params.push(country_id);
    }

    if (active !== undefined) {
      query += ` AND t.active = $${paramCount++}`;
      params.push(active === 'true');
    }

    query += ' ORDER BY t.sequence, t.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching taxes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tax by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, tg.name as tax_group_name
       FROM account_tax t
       LEFT JOIN account_tax_group tg ON t.tax_group_id = tg.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching tax:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create tax
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      type_tax_use,
      amount_type,
      amount,
      tax_group_id,
      account_id,
      refund_account_id,
      country_id,
      active,
      sequence,
      price_include,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO account_tax 
       (name, code, type_tax_use, amount_type, amount, tax_group_id, account_id, 
        refund_account_id, country_id, active, sequence, price_include)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        name,
        code || null,
        type_tax_use,
        amount_type || 'percent',
        amount,
        tax_group_id || null,
        account_id || null,
        refund_account_id || null,
        country_id || null,
        active !== false,
        sequence || 0,
        price_include || false,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating tax:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Tax code already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ========== TAX RETURNS ==========

// Get all tax returns
router.get('/returns', async (req, res) => {
  try {
    const { tax_type, state, period_start, period_end } = req.query;
    let query = 'SELECT * FROM account_tax_return WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (tax_type) {
      query += ` AND tax_type = $${paramCount++}`;
      params.push(tax_type);
    }

    if (state) {
      query += ` AND state = $${paramCount++}`;
      params.push(state);
    }

    if (period_start) {
      query += ` AND period_start >= $${paramCount++}`;
      params.push(period_start);
    }

    if (period_end) {
      query += ` AND period_end <= $${paramCount++}`;
      params.push(period_end);
    }

    query += ' ORDER BY period_start DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tax returns:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create tax return
router.post('/returns', async (req, res) => {
  try {
    const {
      name,
      tax_type,
      period_start,
      period_end,
      filing_date,
      due_date,
    } = req.body;

    // Calculate totals from transactions (simplified - would need actual calculation)
    const result = await pool.query(
      `INSERT INTO account_tax_return 
       (name, tax_type, period_start, period_end, filing_date, due_date, state)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING *`,
      [name, tax_type, period_start, period_end, filing_date || null, due_date || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating tax return:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// File tax return
router.post('/returns/:id/file', async (req, res) => {
  try {
    const { export_file_path } = req.body;

    const result = await pool.query(
      `UPDATE account_tax_return 
       SET state = 'filed', 
           export_file_path = $1,
           filed_at = CURRENT_TIMESTAMP,
           filed_by = $2
       WHERE id = $3 AND state = 'draft'
       RETURNING *`,
      [export_file_path || null, req.body.user_id || 1, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax return not found or cannot be filed' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error filing tax return:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

