import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all promotions
router.get('/', async (req, res) => {
  try {
    const { site_id, is_active, code } = req.query;
    let query = 'SELECT * FROM website_promotions WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (site_id) {
      query += ` AND site_id = $${paramCount++}`;
      params.push(site_id);
    }

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount++}`;
      params.push(is_active === 'true');
    }

    if (code) {
      query += ` AND code = $${paramCount++}`;
      params.push(code);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get promotion by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_promotions WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create promotion
router.post('/', async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      usage_limit,
      usage_limit_per_customer,
      is_active,
      applicable_products,
      applicable_categories,
      site_id,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO website_promotions (
        name, code, description, discount_type, discount_value,
        min_purchase_amount, max_discount_amount, valid_from, valid_until,
        usage_limit, usage_limit_per_customer, is_active,
        applicable_products, applicable_categories, site_id
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        name,
        code,
        description,
        discount_type,
        discount_value,
        min_purchase_amount || 0,
        max_discount_amount,
        valid_from,
        valid_until,
        usage_limit,
        usage_limit_per_customer || 1,
        is_active !== false,
        applicable_products ? JSON.stringify(applicable_products) : null,
        applicable_categories ? JSON.stringify(applicable_categories) : null,
        site_id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Promotion code already exists' });
    }
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update promotion
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      discount_type,
      discount_value,
      min_purchase_amount,
      max_discount_amount,
      valid_from,
      valid_until,
      usage_limit,
      usage_limit_per_customer,
      is_active,
      applicable_products,
      applicable_categories,
    } = req.body;

    const result = await pool.query(
      `UPDATE website_promotions 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           discount_type = COALESCE($3, discount_type),
           discount_value = COALESCE($4, discount_value),
           min_purchase_amount = COALESCE($5, min_purchase_amount),
           max_discount_amount = COALESCE($6, max_discount_amount),
           valid_from = COALESCE($7, valid_from),
           valid_until = COALESCE($8, valid_until),
           usage_limit = COALESCE($9, usage_limit),
           usage_limit_per_customer = COALESCE($10, usage_limit_per_customer),
           is_active = COALESCE($11, is_active),
           applicable_products = COALESCE($12, applicable_products),
           applicable_categories = COALESCE($13, applicable_categories)
       WHERE id = $14
       RETURNING *`,
      [
        name,
        description,
        discount_type,
        discount_value,
        min_purchase_amount,
        max_discount_amount,
        valid_from,
        valid_until,
        usage_limit,
        usage_limit_per_customer,
        is_active,
        applicable_products ? JSON.stringify(applicable_products) : null,
        applicable_categories ? JSON.stringify(applicable_categories) : null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete promotion
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM website_promotions WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

