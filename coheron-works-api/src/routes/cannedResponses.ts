import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// CANNED RESPONSES / MACROS
// ============================================

// Get all canned responses
router.get('/', async (req, res) => {
  try {
    const { category, is_public, search, created_by } = req.query;
    let query = `
      SELECT cr.*, u.name as created_by_name
      FROM canned_responses cr
      LEFT JOIN users u ON cr.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND cr.category = $${paramCount++}`;
      params.push(category);
    }

    if (is_public !== undefined) {
      query += ` AND cr.is_public = $${paramCount++}`;
      params.push(is_public === 'true');
    }

    if (created_by) {
      query += ` AND cr.created_by = $${paramCount++}`;
      params.push(created_by);
    }

    if (search) {
      query += ` AND (cr.name ILIKE $${paramCount} OR cr.content ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ' ORDER BY cr.usage_count DESC, cr.name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching canned responses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get canned response by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, u.name as created_by_name
       FROM canned_responses cr
       LEFT JOIN users u ON cr.created_by = u.id
       WHERE cr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching canned response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create canned response
router.post('/', async (req, res) => {
  try {
    const { name, shortcut, content, category, is_public, created_by } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    const result = await pool.query(
      `INSERT INTO canned_responses (name, shortcut, content, category, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, shortcut, content, category, is_public !== undefined ? is_public : false, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating canned response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update canned response
router.put('/:id', async (req, res) => {
  try {
    const { name, shortcut, content, category, is_public } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      params.push(name);
    }
    if (shortcut !== undefined) {
      updateFields.push(`shortcut = $${paramCount++}`);
      params.push(shortcut);
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramCount++}`);
      params.push(content);
    }
    if (category !== undefined) {
      updateFields.push(`category = $${paramCount++}`);
      params.push(category);
    }
    if (is_public !== undefined) {
      updateFields.push(`is_public = $${paramCount++}`);
      params.push(is_public);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE canned_responses SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating canned response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Increment usage count
router.post('/:id/use', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE canned_responses SET usage_count = usage_count + 1 WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating usage count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete canned response
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM canned_responses WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    res.json({ message: 'Canned response deleted successfully' });
  } catch (error) {
    console.error('Error deleting canned response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

