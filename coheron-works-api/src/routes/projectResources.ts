import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// RESOURCE PLANNING & CAPACITY MANAGEMENT
// ============================================

// Get project resources with capacity analysis
router.get('/:projectId/resources', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, 
              u.name as user_name,
              u.email as user_email,
              SUM(ts.hours_worked) as total_hours_logged,
              (pr.planned_hours - COALESCE(SUM(ts.hours_worked), 0)) as remaining_hours
       FROM project_resources pr
       LEFT JOIN users u ON pr.user_id = u.id
       LEFT JOIN timesheets ts ON pr.project_id = ts.project_id AND pr.user_id = ts.user_id AND ts.approval_status = 'approved'
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

// Get resource capacity across all projects
router.get('/resources/:userId/capacity', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let dateFilter = '';
    const params: any[] = [req.params.userId];
    let paramCount = 2;

    if (date_from && date_to) {
      dateFilter = `AND pr.start_date <= $${paramCount} AND pr.end_date >= $${paramCount - 1}`;
      params.push(date_to, date_from);
      paramCount += 2;
    }

    const result = await pool.query(
      `SELECT 
         pr.project_id,
         p.name as project_name,
         p.code as project_code,
         pr.allocation_percentage,
         pr.planned_hours,
         pr.actual_hours,
         pr.start_date,
         pr.end_date,
         SUM(ts.hours_worked) as logged_hours
       FROM project_resources pr
       LEFT JOIN projects p ON pr.project_id = p.id
       LEFT JOIN timesheets ts ON pr.project_id = ts.project_id AND pr.user_id = ts.user_id
       WHERE pr.user_id = $1 ${dateFilter}
       GROUP BY pr.id, p.name, p.code
       ORDER BY pr.start_date`,
      params
    );

    // Calculate total allocation
    const totalAllocation = result.rows.reduce((sum, row) => sum + (row.allocation_percentage || 0), 0);

    res.json({
      resources: result.rows,
      total_allocation: totalAllocation,
      available_capacity: Math.max(0, 100 - totalAllocation),
    });
  } catch (error) {
    console.error('Error fetching capacity:', error);
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
      cost_rate_per_hour,
      planned_hours,
      start_date,
      end_date,
      shift_type,
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

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
        cost_rate_per_hour, planned_hours, start_date, end_date, shift_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.params.projectId,
        user_id,
        role,
        skill_level || 'mid',
        allocation_percentage || 100,
        cost_rate_per_hour || 0,
        planned_hours || 0,
        start_date,
        end_date,
        shift_type || 'day',
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
      cost_rate_per_hour,
      planned_hours,
      actual_hours,
      start_date,
      end_date,
      shift_type,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      role,
      skill_level,
      allocation_percentage,
      cost_rate_per_hour,
      planned_hours,
      actual_hours,
      start_date,
      end_date,
      shift_type,
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

// Get skills matrix for project
router.get('/:projectId/skills-matrix', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         pr.role,
         pr.skill_level,
         COUNT(DISTINCT pr.user_id) as resource_count,
         SUM(pr.planned_hours) as total_planned_hours,
         SUM(pr.actual_hours) as total_actual_hours
       FROM project_resources pr
       WHERE pr.project_id = $1
       GROUP BY pr.role, pr.skill_level
       ORDER BY pr.role, 
         CASE pr.skill_level
           WHEN 'expert' THEN 1
           WHEN 'senior' THEN 2
           WHEN 'mid' THEN 3
           WHEN 'junior' THEN 4
         END`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching skills matrix:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

