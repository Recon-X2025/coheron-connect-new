import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// Get payslips
router.get('/payslips', async (req, res) => {
  try {
    const { employee_id, from_date, to_date } = req.query;
    let query = `
      SELECT p.*, e.name as employee_name, e.employee_id as emp_id
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND p.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }
    if (from_date && to_date) {
      query += ` AND p.date_from BETWEEN $${paramCount} AND $${paramCount + 1}`;
      params.push(from_date, to_date);
      paramCount += 2;
    }

    query += ' ORDER BY p.date_from DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get salary structure
router.get('/salary-structure/:employee_id', async (req, res) => {
  try {
    const { employee_id } = req.params;
    const result = await pool.query(`
      SELECT * FROM salary_structures
      WHERE employee_id = $1 AND is_active = true
      ORDER BY component_type, component_name
    `, [employee_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching salary structure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/Update salary structure
router.post('/salary-structure', async (req, res) => {
  try {
    const { employee_id, component_type, component_name, amount, calculation_type, percentage } = req.body;

    const result = await pool.query(`
      INSERT INTO salary_structures (employee_id, component_type, component_name, amount, calculation_type, percentage)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [employee_id, component_type, component_name, amount, calculation_type, percentage]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating salary structure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update salary structure
router.put('/salary-structure/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, calculation_type, percentage, is_active } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      params.push(amount);
      paramCount++;
    }
    if (calculation_type !== undefined) {
      updates.push(`calculation_type = $${paramCount}`);
      params.push(calculation_type);
      paramCount++;
    }
    if (percentage !== undefined) {
      updates.push(`percentage = $${paramCount}`);
      params.push(percentage);
      paramCount++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE salary_structures SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary structure not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating salary structure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete salary structure
router.delete('/salary-structure/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM salary_structures WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Salary structure not found' });
    }
    res.json({ message: 'Salary structure deleted successfully' });
  } catch (error) {
    console.error('Error deleting salary structure:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create payslip
router.post('/payslips', async (req, res) => {
  try {
    const { employee_id, name, date_from, date_to, basic_wage, gross_wage, net_wage } = req.body;

    const result = await pool.query(`
      INSERT INTO payslips (employee_id, name, date_from, date_to, basic_wage, gross_wage, net_wage, state)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING *
    `, [employee_id, name, date_from, date_to, basic_wage, gross_wage, net_wage]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating payslip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payslip
router.put('/payslips/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { basic_wage, gross_wage, net_wage, state } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (basic_wage !== undefined) {
      updates.push(`basic_wage = $${paramCount}`);
      params.push(basic_wage);
      paramCount++;
    }
    if (gross_wage !== undefined) {
      updates.push(`gross_wage = $${paramCount}`);
      params.push(gross_wage);
      paramCount++;
    }
    if (net_wage !== undefined) {
      updates.push(`net_wage = $${paramCount}`);
      params.push(net_wage);
      paramCount++;
    }
    if (state !== undefined) {
      updates.push(`state = $${paramCount}`);
      params.push(state);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE payslips SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payslip not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating payslip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payroll statistics
router.get('/stats', async (req, res) => {
  try {
    const employeeCount = await pool.query('SELECT COUNT(*) as count FROM employees');
    const payslipStats = await pool.query(`
      SELECT 
        COUNT(*) as total_payslips,
        COALESCE(SUM(net_wage), 0) as total_amount,
        COUNT(CASE WHEN state = 'done' THEN 1 END) as completed,
        COUNT(CASE WHEN state = 'draft' THEN 1 END) as pending
      FROM payslips
      WHERE date_from >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    res.json({
      total_employees: parseInt(employeeCount.rows[0]?.count || '0'),
      this_month_payroll: parseFloat(payslipStats.rows[0]?.total_amount || '0'),
      pending_approvals: parseInt(payslipStats.rows[0]?.pending || '0'),
      compliance_status: 98,
    });
  } catch (error) {
    console.error('Error fetching payroll stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

