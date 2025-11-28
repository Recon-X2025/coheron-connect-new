import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get attendance records
router.get('/', async (req, res) => {
  try {
    const { employee_id, date, from_date, to_date } = req.query;
    let query = 'SELECT a.*, e.name as employee_name, e.employee_id as emp_id FROM attendance a JOIN employees e ON a.employee_id = e.id WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND a.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }
    if (date) {
      query += ` AND a.date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }
    if (from_date && to_date) {
      query += ` AND a.date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(from_date, to_date);
      paramCount += 2;
    }

    query += ' ORDER BY a.date DESC, e.name';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update attendance record
router.post('/', async (req, res) => {
  try {
    const { employee_id, date, check_in, check_out, hours_worked, status } = req.body;

    const result = await pool.query(`
      INSERT INTO attendance (employee_id, date, check_in, check_out, hours_worked, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (employee_id, date)
      DO UPDATE SET check_in = $3, check_out = $4, hours_worked = $5, status = $6
      RETURNING *
    `, [employee_id, date, check_in, check_out, hours_worked, status]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

