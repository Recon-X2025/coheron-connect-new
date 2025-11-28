import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// RESOURCE PLANNING
// ============================================

// Get project resources
router.get('/:projectId/resources', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, 
              u.name as user_name,
              u.email as user_email,
              SUM(ts.hours_worked) as total_hours_logged
       FROM project_resources pr
       LEFT JOIN users u ON pr.user_id = u.id
       LEFT JOIN timesheets ts ON pr.project_id = ts.project_id AND pr.user_id = ts.user_id
       WHERE pr.project_id = $1
       GROUP BY pr.id, u.name, u.email
       ORDER BY pr.created_at`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add resource to project
router.post('/:projectId/resources', async (req, res) => {
  try {
    const {
      user_id,
      role,
      skill_level,
      allocation_percentage,
      cost_rate,
      planned_start_date,
      planned_end_date,
    } = req.body;

    // Check if resource already exists
    const existing = await pool.query(
      'SELECT id FROM project_resources WHERE project_id = $1 AND user_id = $2',
      [req.params.projectId, user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Resource already assigned to project' });
    }

    const result = await pool.query(
      `INSERT INTO project_resources (
        project_id, user_id, role, skill_level, allocation_percentage,
        cost_rate, planned_start_date, planned_end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.params.projectId,
        user_id,
        role,
        skill_level || 'mid',
        allocation_percentage || 100,
        cost_rate,
        planned_start_date,
        planned_end_date,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding resource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update resource
router.put('/resources/:id', async (req, res) => {
  try {
    const {
      role,
      skill_level,
      allocation_percentage,
      cost_rate,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      role,
      skill_level,
      allocation_percentage,
      cost_rate,
      planned_start_date,
      planned_end_date,
      actual_start_date,
      actual_end_date,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_resources SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove resource
router.delete('/resources/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM project_resources WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    res.json({ message: 'Resource removed successfully' });
  } catch (error) {
    console.error('Error removing resource:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// TIMESHEETS
// ============================================

// Get timesheets
router.get('/timesheets', async (req, res) => {
  try {
    const { project_id, user_id, date_from, date_to, approval_status } = req.query;
    let query = `
      SELECT ts.*, 
             u.name as user_name,
             u.email as user_email,
             p.name as project_name,
             p.code as project_code,
             t.name as task_name
      FROM timesheets ts
      LEFT JOIN users u ON ts.user_id = u.id
      LEFT JOIN projects p ON ts.project_id = p.id
      LEFT JOIN project_tasks t ON ts.task_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (project_id) {
      query += ` AND ts.project_id = $${paramCount++}`;
      params.push(project_id);
    }

    if (user_id) {
      query += ` AND ts.user_id = $${paramCount++}`;
      params.push(user_id);
    }

    if (date_from) {
      query += ` AND ts.date_worked >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND ts.date_worked <= $${paramCount++}`;
      params.push(date_to);
    }

    if (approval_status) {
      query += ` AND ts.approval_status = $${paramCount++}`;
      params.push(approval_status);
    }

    query += ' ORDER BY ts.date_worked DESC, ts.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get timesheet by ID
router.get('/timesheets/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ts.*, 
              u.name as user_name,
              u.email as user_email,
              p.name as project_name,
              p.code as project_code,
              t.name as task_name
       FROM timesheets ts
       LEFT JOIN users u ON ts.user_id = u.id
       LEFT JOIN projects p ON ts.project_id = p.id
       LEFT JOIN project_tasks t ON ts.task_id = t.id
       WHERE ts.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching timesheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create timesheet entry
router.post('/timesheets', async (req, res) => {
  try {
    const {
      project_id,
      task_id,
      user_id,
      date_worked,
      hours_worked,
      description,
      is_billable,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO timesheets (
        project_id, task_id, user_id, date_worked, hours_worked,
        description, is_billable, approval_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING *`,
      [
        project_id,
        task_id,
        user_id,
        date_worked,
        hours_worked,
        description,
        is_billable !== undefined ? is_billable : true,
      ]
    );

    // Update task actual hours
    if (task_id) {
      await pool.query(
        `UPDATE project_tasks 
         SET actual_hours = COALESCE(actual_hours, 0) + $1
         WHERE id = $2`,
        [hours_worked, task_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating timesheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update timesheet
router.put('/timesheets/:id', async (req, res) => {
  try {
    const {
      task_id,
      date_worked,
      hours_worked,
      description,
      is_billable,
      approval_status,
    } = req.body;

    // Get old timesheet to calculate difference
    const oldTimesheet = await pool.query(
      'SELECT task_id, hours_worked FROM timesheets WHERE id = $1',
      [req.params.id]
    );

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      task_id,
      date_worked,
      hours_worked,
      description,
      is_billable,
      approval_status,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Handle approval
    if (approval_status === 'approved' && !req.body.approved_at) {
      updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE timesheets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    // Update task actual hours if hours changed
    if (hours_worked !== undefined && oldTimesheet.rows.length > 0) {
      const oldHours = parseFloat(oldTimesheet.rows[0].hours_worked) || 0;
      const newHours = parseFloat(hours_worked);
      const diff = newHours - oldHours;

      if (diff !== 0 && oldTimesheet.rows[0].task_id) {
        await pool.query(
          `UPDATE project_tasks 
           SET actual_hours = COALESCE(actual_hours, 0) + $1
           WHERE id = $2`,
          [diff, oldTimesheet.rows[0].task_id]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating timesheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete timesheet
router.delete('/timesheets/:id', async (req, res) => {
  try {
    // Get timesheet before deletion
    const timesheet = await pool.query(
      'SELECT task_id, hours_worked FROM timesheets WHERE id = $1',
      [req.params.id]
    );

    const result = await pool.query('DELETE FROM timesheets WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    // Update task actual hours
    if (timesheet.rows.length > 0 && timesheet.rows[0].task_id) {
      const hours = parseFloat(timesheet.rows[0].hours_worked) || 0;
      await pool.query(
        `UPDATE project_tasks 
         SET actual_hours = GREATEST(COALESCE(actual_hours, 0) - $1, 0)
         WHERE id = $2`,
        [hours, timesheet.rows[0].task_id]
      );
    }

    res.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    console.error('Error deleting timesheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit timesheet for approval
router.post('/timesheets/:id/submit', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE timesheets 
       SET approval_status = 'submitted'
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject timesheet
router.post('/timesheets/:id/approve', async (req, res) => {
  try {
    const { status, approved_by } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE timesheets 
       SET approval_status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, approved_by, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error approving timesheet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get timesheet summary for a project
router.get('/:projectId/timesheets/summary', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let query = `
      SELECT 
        ts.user_id,
        u.name as user_name,
        SUM(ts.hours_worked) as total_hours,
        SUM(CASE WHEN ts.is_billable THEN ts.hours_worked ELSE 0 END) as billable_hours,
        SUM(CASE WHEN ts.approval_status = 'approved' THEN ts.hours_worked ELSE 0 END) as approved_hours,
        COUNT(*) as entry_count
      FROM timesheets ts
      LEFT JOIN users u ON ts.user_id = u.id
      WHERE ts.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (date_from) {
      query += ` AND ts.date_worked >= $${paramCount++}`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND ts.date_worked <= $${paramCount++}`;
      params.push(date_to);
    }

    query += ' GROUP BY ts.user_id, u.name ORDER BY total_hours DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching timesheet summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

