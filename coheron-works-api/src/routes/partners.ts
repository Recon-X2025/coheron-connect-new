import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all partners
router.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = 'SELECT * FROM partners WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get partner by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM partners WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching partner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create partner
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, type, image_url } = req.body;

    const result = await pool.query(
      `INSERT INTO partners (name, email, phone, company, type, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, phone, company, type || 'contact', image_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating partner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update partner
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, type, image_url } = req.body;

    const result = await pool.query(
      `UPDATE partners 
       SET name = $1, email = $2, phone = $3, company = $4, type = $5, image_url = $6
       WHERE id = $7
       RETURNING *`,
      [name, email, phone, company, type, image_url, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete partner
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM partners WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    res.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    console.error('Error deleting partner:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

