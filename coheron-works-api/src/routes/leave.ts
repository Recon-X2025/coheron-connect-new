import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get leave requests
router.get('/requests', async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = `
      SELECT lr.*, e.name as employee_name, e.employee_id as emp_id
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND lr.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }
    if (status) {
      query += ` AND lr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY lr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create leave request
router.post('/requests', async (req, res) => {
  try {
    const { employee_id, leave_type, from_date, to_date, days, reason, contact_during_leave } = req.body;

    const result = await pool.query(`
      INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, days, reason, contact_during_leave)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [employee_id, leave_type, from_date, to_date, days, reason, contact_during_leave]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/Reject leave request
router.put('/requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by } = req.body;

    const result = await pool.query(`
      UPDATE leave_requests
      SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, approved_by, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leave balance
router.get('/balance/:employee_id', async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const result = await pool.query(`
      SELECT * FROM leave_balance
      WHERE employee_id = $1 AND year = $2
    `, [employee_id, currentYear]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

