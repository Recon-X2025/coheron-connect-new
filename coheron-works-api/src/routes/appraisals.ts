import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get appraisals
router.get('/', async (req, res) => {
  try {
    const { employee_id, state } = req.query;
    let query = `
      SELECT a.*, 
             e1.name as employee_name, e1.employee_id as emp_id,
             e2.name as manager_name
      FROM appraisals a
      JOIN employees e1 ON a.employee_id = e1.id
      LEFT JOIN employees e2 ON a.manager_id = e2.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND a.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }
    if (state) {
      query += ` AND a.state = $${paramCount}`;
      params.push(state);
      paramCount++;
    }

    query += ' ORDER BY a.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching appraisals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create appraisal
router.post('/', async (req, res) => {
  try {
    const { employee_id, manager_id, appraisal_period, date_close } = req.body;

    const result = await pool.query(`
      INSERT INTO appraisals (employee_id, manager_id, appraisal_period, date_close)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [employee_id, manager_id, appraisal_period, date_close]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating appraisal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appraisal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { final_assessment, state } = req.body;

    const result = await pool.query(`
      UPDATE appraisals
      SET final_assessment = $1, state = $2
      WHERE id = $3
      RETURNING *
    `, [final_assessment, state, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating appraisal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

