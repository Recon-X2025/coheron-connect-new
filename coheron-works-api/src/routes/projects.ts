import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// PROJECT MASTER DATA - CRUD Operations
// ============================================

// Get all projects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message, code: error.code });
  }
});

// Get project by ID with full details
router.get('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get project details
    const projectResult = await pool.query(
      `SELECT p.*
       FROM projects p
       WHERE p.id = $1`,
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Get stakeholders
    const stakeholdersResult = await pool.query(
      `SELECT ps.*, u.name as user_name, u.email as user_email
       FROM project_stakeholders ps
       LEFT JOIN users u ON ps.user_id = u.id
       WHERE ps.project_id = $1`,
      [projectId]
    );

    // Get budget summary
    const budgetResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN budget_type = 'revenue' THEN planned_amount ELSE 0 END) as total_revenue,
         SUM(CASE WHEN budget_type = 'capex' THEN planned_amount ELSE 0 END) as total_capex,
         SUM(CASE WHEN budget_type = 'opex' THEN planned_amount ELSE 0 END) as total_opex,
         SUM(committed_amount) as total_committed,
         SUM(actual_amount) as total_actual
       FROM project_budgets
       WHERE project_id = $1`,
      [projectId]
    );

    // Get cost summary
    const costResult = await pool.query(
      `SELECT 
         SUM(amount) as total_cost,
         COUNT(*) as cost_count
       FROM project_costs
       WHERE project_id = $1`,
      [projectId]
    );

    // Get task summary
    const taskResult = await pool.query(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
         SUM(estimated_hours) as total_estimated_hours,
         SUM(actual_hours) as total_actual_hours
       FROM project_tasks
       WHERE project_id = $1`,
      [projectId]
    );

    res.json({
      ...project,
      stakeholders: stakeholdersResult.rows,
      budget_summary: budgetResult.rows[0] || {},
      cost_summary: costResult.rows[0] || {},
      task_summary: taskResult.rows[0] || {},
    });
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const {
      code,
      key,
      name,
      description,
      project_type,
      industry_sector,
      contract_type,
      billing_type,
      start_date,
      end_date,
      project_manager_id,
      lead_id,
      partner_id,
      parent_program_id,
      state,
      status,
      avatar_url,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Use code if provided, otherwise use key, otherwise generate
    let projectCode = code || key;
    let projectKey = key || code;
    
    if (!projectCode) {
      // Generate code from name
      projectCode = name.substring(0, 8).toUpperCase().replace(/\s+/g, '-') + '-' + Date.now().toString().slice(-4);
    }
    
    if (!projectKey) {
      // Use code as key if key not provided
      projectKey = projectCode;
    }

    // Check if code/key already exists
    const existing = await pool.query(
      'SELECT id FROM projects WHERE code = $1 OR key = $1',
      [projectCode]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Project code/key already exists' });
    }

    // Build insert query - both key and code are required by schema
    const insertFields: string[] = ['key', 'code', 'name'];
    const insertValues: any[] = [projectKey, projectCode, name];
    let paramCount = 4;

    // Optional fields
    const optionalFields: Record<string, any> = {
      description,
      project_type: project_type || 'client',
      industry_sector,
      contract_type: contract_type || 'fixed_bid',
      billing_type: billing_type || 'milestone',
      start_date,
      end_date,
      project_manager_id: project_manager_id || lead_id,
      partner_id,
      parent_program_id,
      state: state || status || 'draft',
      avatar_url,
    };

    Object.entries(optionalFields).forEach(([field, value]) => {
      if (value !== undefined && value !== null) {
        insertFields.push(field);
        insertValues.push(value);
        paramCount++;
      }
    });

    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO projects (${insertFields.join(', ')}) VALUES (${placeholders}) RETURNING *`;

    const result = await pool.query(query, insertValues);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Project code/key already exists' });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const {
      code,
      key,
      name,
      description,
      project_type,
      industry_sector,
      contract_type,
      billing_type,
      start_date,
      end_date,
      project_manager_id,
      lead_id,
      partner_id,
      parent_program_id,
      state,
      status,
      avatar_url,
    } = req.body;

    // If code/key is being changed, check if new value exists
    if (code || key) {
      const checkValue = code || key;
      const existing = await pool.query(
        'SELECT id FROM projects WHERE (code = $1 OR key = $1) AND id != $2',
        [checkValue, projectId]
      );

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Project code/key already exists' });
      }
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields: Record<string, any> = {
      code,
      key,
      name,
      description,
      project_type,
      industry_sector,
      contract_type,
      billing_type,
      start_date,
      end_date,
      project_manager_id: project_manager_id || lead_id,
      partner_id,
      parent_program_id,
      state: state || status,
      avatar_url,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(projectId);
    const query = `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [
      projectId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================
// PROJECT STAKEHOLDERS
// ============================================

// Get project stakeholders
router.get('/:id/stakeholders', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await pool.query(
      `SELECT ps.*, u.name as user_name, u.email as user_email
       FROM project_stakeholders ps
       LEFT JOIN users u ON ps.user_id = u.id
       WHERE ps.project_id = $1
       ORDER BY ps.created_at`,
      [projectId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching stakeholders:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Add stakeholder
router.post('/:id/stakeholders', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const { user_id, role } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if stakeholder already exists
    const existing = await pool.query(
      'SELECT id FROM project_stakeholders WHERE project_id = $1 AND user_id = $2',
      [projectId, user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Stakeholder already exists' });
    }

    const result = await pool.query(
      `INSERT INTO project_stakeholders (project_id, user_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [projectId, user_id, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error adding stakeholder:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Remove stakeholder
router.delete('/:id/stakeholders/:stakeholderId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const stakeholderId = parseInt(req.params.stakeholderId);
    
    if (isNaN(projectId) || isNaN(stakeholderId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const result = await pool.query(
      'DELETE FROM project_stakeholders WHERE id = $1 AND project_id = $2 RETURNING id',
      [stakeholderId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stakeholder not found' });
    }

    res.json({ message: 'Stakeholder removed successfully' });
  } catch (error: any) {
    console.error('Error removing stakeholder:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================
// PROJECT APPROVALS
// ============================================

// Get project approvals
router.get('/:id/approvals', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const result = await pool.query(
      `SELECT pa.*, u.name as approver_name
       FROM project_approvals pa
       LEFT JOIN users u ON pa.approver_id = u.id
       WHERE pa.project_id = $1
       ORDER BY pa.created_at DESC`,
      [projectId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Create approval request
router.post('/:id/approvals', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const { approval_type, approver_id, comments } = req.body;

    if (!approval_type || !approver_id) {
      return res.status(400).json({ error: 'Approval type and approver ID are required' });
    }

    const result = await pool.query(
      `INSERT INTO project_approvals (project_id, approval_type, approver_id, comments, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [projectId, approval_type, approver_id, comments]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating approval:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update approval status
router.put('/:id/approvals/:approvalId', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const approvalId = parseInt(req.params.approvalId);
    
    if (isNaN(projectId) || isNaN(approvalId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const { status, comments } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
    }

    const updateFields: string[] = ['status = $1'];
    const params: any[] = [status];
    let paramCount = 2;

    if (comments) {
      updateFields.push(`comments = $${paramCount++}`);
      params.push(comments);
    }

    if (status === 'approved') {
      updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    params.push(approvalId, projectId);
    const query = `UPDATE project_approvals 
                   SET ${updateFields.join(', ')} 
                   WHERE id = $${paramCount} AND project_id = $${paramCount + 1}
                   RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating approval:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ============================================
// PROJECT DASHBOARD / KPI SUMMARY
// ============================================

router.get('/:id/dashboard', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get project basic info
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get budget vs actuals
    const budgetResult = await pool.query(
      `SELECT 
         SUM(CASE WHEN budget_type = 'revenue' THEN planned_amount ELSE 0 END) as planned_revenue,
         SUM(CASE WHEN budget_type = 'revenue' THEN actual_amount ELSE 0 END) as actual_revenue,
         SUM(CASE WHEN budget_type = 'capex' THEN planned_amount ELSE 0 END) as planned_capex,
         SUM(CASE WHEN budget_type = 'capex' THEN actual_amount ELSE 0 END) as actual_capex,
         SUM(CASE WHEN budget_type = 'opex' THEN planned_amount ELSE 0 END) as planned_opex,
         SUM(CASE WHEN budget_type = 'opex' THEN actual_amount ELSE 0 END) as actual_opex
       FROM project_budgets
       WHERE project_id = $1`,
      [projectId]
    );

    // Get task statistics
    const taskResult = await pool.query(
      `SELECT 
         COUNT(*) as total_tasks,
         COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_tasks,
         COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
         COUNT(CASE WHEN status = 'backlog' THEN 1 END) as backlog_tasks,
         SUM(estimated_hours) as total_estimated_hours,
         SUM(actual_hours) as total_actual_hours
       FROM project_tasks
       WHERE project_id = $1`,
      [projectId]
    );

    // Get timesheet summary
    const timesheetResult = await pool.query(
      `SELECT 
         SUM(hours_worked) as total_hours,
         SUM(CASE WHEN is_billable THEN hours_worked ELSE 0 END) as billable_hours,
         COUNT(DISTINCT user_id) as active_resources
       FROM timesheets
       WHERE project_id = $1 AND approval_status = 'approved'`,
      [projectId]
    );

    // Get risk summary
    const riskResult = await pool.query(
      `SELECT 
         COUNT(*) as total_risks,
         COUNT(CASE WHEN status = 'identified' THEN 1 END) as identified_risks,
         COUNT(CASE WHEN risk_score >= 15 THEN 1 END) as high_risk_count,
         AVG(risk_score) as avg_risk_score
       FROM project_risks
       WHERE project_id = $1`,
      [projectId]
    );

    // Get issue summary
    const issueResult = await pool.query(
      `SELECT 
         COUNT(*) as total_issues,
         COUNT(CASE WHEN status = 'open' THEN 1 END) as open_issues,
         COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_issues
       FROM project_issues
       WHERE project_id = $1`,
      [projectId]
    );

    // Get milestone progress
    const milestoneResult = await pool.query(
      `SELECT 
         COUNT(*) as total_milestones,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_milestones,
         COUNT(CASE WHEN status = 'delayed' THEN 1 END) as delayed_milestones
       FROM project_milestones
       WHERE project_id = $1`,
      [projectId]
    );

    res.json({
      project: projectResult.rows[0],
      budget: budgetResult.rows[0] || {},
      tasks: taskResult.rows[0] || {},
      timesheets: timesheetResult.rows[0] || {},
      risks: riskResult.rows[0] || {},
      issues: issueResult.rows[0] || {},
      milestones: milestoneResult.rows[0] || {},
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

