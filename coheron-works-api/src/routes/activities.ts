import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get activities for a resource
router.get('/', async (req, res) => {
  try {
    const { res_id, res_model } = req.query;

    if (!res_id || !res_model) {
      return res.status(400).json({ error: 'res_id and res_model are required' });
    }

    const result = await pool.query(
      `SELECT a.*, u.name as user_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.res_id = $1 AND a.res_model = $2
       ORDER BY a.date_deadline DESC, a.created_at DESC`,
      [res_id, res_model]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create activity
router.post('/', async (req, res) => {
  try {
    const {
      res_id,
      res_model,
      activity_type,
      summary,
      description,
      date_deadline,
      user_id,
      state,
      duration,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO activities (res_id, res_model, activity_type, summary, description, date_deadline, user_id, state, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        res_id,
        res_model,
        activity_type || 'note',
        summary,
        description,
        date_deadline,
        user_id || 1,
        state || 'planned',
        duration,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update activity
router.put('/:id', async (req, res) => {
  try {
    const { summary, description, state, date_deadline, duration } = req.body;

    const result = await pool.query(
      `UPDATE activities 
       SET summary = COALESCE($1, summary),
           description = COALESCE($2, description),
           state = COALESCE($3, state),
           date_deadline = COALESCE($4, date_deadline),
           duration = COALESCE($5, duration)
       WHERE id = $6
       RETURNING *`,
      [summary, description, state, date_deadline, duration, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM activities WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

