import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get goals
router.get('/', async (req, res) => {
  try {
    const { employee_id, status, goal_type } = req.query;
    let query = `
      SELECT g.*, 
             e.name as employee_name, e.employee_id as emp_id
      FROM goals g
      JOIN employees e ON g.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND g.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }
    if (status) {
      query += ` AND g.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    if (goal_type) {
      query += ` AND g.goal_type = $${paramCount}`;
      params.push(goal_type);
      paramCount++;
    }

    query += ' ORDER BY g.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get goal by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT g.*, 
             e.name as employee_name, e.employee_id as emp_id
      FROM goals g
      JOIN employees e ON g.employee_id = e.id
      WHERE g.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create goal
router.post('/', async (req, res) => {
  try {
    const {
      employee_id,
      title,
      description,
      goal_type,
      target_value,
      current_value,
      status,
      due_date,
    } = req.body;

    if (!employee_id || !title) {
      return res.status(400).json({ error: 'Employee ID and title are required' });
    }

    const result = await pool.query(`
      INSERT INTO goals (
        employee_id, title, description, goal_type,
        target_value, current_value, status, due_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      employee_id,
      title,
      description || null,
      goal_type || 'okr',
      target_value || null,
      current_value || 0,
      status || 'on_track',
      due_date || null,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      goal_type,
      target_value,
      current_value,
      status,
      due_date,
    } = req.body;

    const result = await pool.query(`
      UPDATE goals
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          goal_type = COALESCE($3, goal_type),
          target_value = COALESCE($4, target_value),
          current_value = COALESCE($5, current_value),
          status = COALESCE($6, status),
          due_date = COALESCE($7, due_date),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [title, description, goal_type, target_value, current_value, status, due_date, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM goals WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

