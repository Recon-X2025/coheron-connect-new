import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get policies
router.get('/', async (req, res) => {
  try {
    const { category, is_active } = req.query;
    let query = 'SELECT * FROM policies WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create policy
router.post('/', async (req, res) => {
  try {
    const { name, category, body } = req.body;

    const result = await pool.query(`
      INSERT INTO policies (name, category, body)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [name, category, body]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

