import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get applicants
router.get('/', async (req, res) => {
  try {
    const { stage_id } = req.query;
    let query = 'SELECT * FROM applicants WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (stage_id) {
      query += ` AND stage_id = $${paramCount}`;
      params.push(stage_id);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applicants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create applicant
router.post('/', async (req, res) => {
  try {
    const { partner_name, name, email_from, stage_id, priority } = req.body;

    const result = await pool.query(`
      INSERT INTO applicants (partner_name, name, email_from, stage_id, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [partner_name, name, email_from, stage_id || 1, priority || 0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating applicant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update applicant
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { stage_id, priority } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (stage_id !== undefined) {
      updates.push(`stage_id = $${paramCount}`);
      params.push(stage_id);
      paramCount++;
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE applicants SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating applicant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

