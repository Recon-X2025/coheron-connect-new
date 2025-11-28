import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get courses
router.get('/', async (req, res) => {
  try {
    const { is_active } = req.query;
    let query = 'SELECT * FROM courses WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create course
router.post('/', async (req, res) => {
  try {
    const { name, description, total_time, category, instructor } = req.body;

    const result = await pool.query(`
      INSERT INTO courses (name, description, total_time, category, instructor)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, total_time, category, instructor]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enrollments
router.get('/enrollments', async (req, res) => {
  try {
    const { employee_id, course_id } = req.query;
    let query = `
      SELECT ce.*, e.name as employee_name, c.name as course_name
      FROM course_enrollments ce
      JOIN employees e ON ce.employee_id = e.id
      JOIN courses c ON ce.course_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND ce.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }
    if (course_id) {
      query += ` AND ce.course_id = $${paramCount}`;
      params.push(course_id);
      paramCount++;
    }

    query += ' ORDER BY ce.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

