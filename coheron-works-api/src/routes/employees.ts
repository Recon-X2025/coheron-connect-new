import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get all employees
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.*, 
             epi.date_of_birth, epi.pan_number, epi.aadhaar_number, epi.address,
             ebd.bank_name, ebd.account_number, ebd.ifsc_code
      FROM employees e
      LEFT JOIN employee_personal_info epi ON e.id = epi.employee_id
      LEFT JOIN employee_bank_details ebd ON e.id = ebd.employee_id
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT e.*, 
             epi.*, ebd.*
      FROM employees e
      LEFT JOIN employee_personal_info epi ON e.id = epi.employee_id
      LEFT JOIN employee_bank_details ebd ON e.id = ebd.employee_id
      WHERE e.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create employee
router.post('/', async (req, res) => {
  try {
    const {
      employee_id, name, work_email, work_phone, job_title,
      department_id, manager_id, hire_date, employment_type
    } = req.body;

    const result = await pool.query(`
      INSERT INTO employees (employee_id, name, work_email, work_phone, job_title, 
                            department_id, manager_id, hire_date, employment_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [employee_id, name, work_email, work_phone, job_title, 
        department_id, manager_id, hire_date, employment_type]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, work_email, work_phone, job_title,
      department_id, manager_id, hire_date, employment_type
    } = req.body;

    const result = await pool.query(`
      UPDATE employees
      SET name = $1, work_email = $2, work_phone = $3, job_title = $4,
          department_id = $5, manager_id = $6, hire_date = $7, employment_type = $8
      WHERE id = $9
      RETURNING *
    `, [name, work_email, work_phone, job_title, department_id, 
        manager_id, hire_date, employment_type, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

