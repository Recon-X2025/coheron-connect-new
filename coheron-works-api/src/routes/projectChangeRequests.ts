import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// CHANGE REQUESTS (Fixed to match schema)
// ============================================

// Get project change requests
router.get('/:projectId/change-requests', async (req, res) => {
  try {
    const { status, change_type } = req.query;
    let query = `
      SELECT cr.*, 
             u1.name as requested_by_name,
             u2.name as approved_by_name
      FROM project_change_requests cr
      LEFT JOIN users u1 ON cr.requested_by = u1.id
      LEFT JOIN users u2 ON cr.approved_by = u2.id
      WHERE cr.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND cr.status = $${paramCount++}`;
      params.push(status);
    }

    if (change_type) {
      query += ` AND cr.change_type = $${paramCount++}`;
      params.push(change_type);
    }

    query += ' ORDER BY cr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching change requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get change request by ID
router.get('/change-requests/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cr.*, 
              u1.name as requested_by_name,
              u1.email as requested_by_email,
              u2.name as approved_by_name,
              u2.email as approved_by_email
       FROM project_change_requests cr
       LEFT JOIN users u1 ON cr.requested_by = u1.id
       LEFT JOIN users u2 ON cr.approved_by = u2.id
       WHERE cr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create change request
router.post('/:projectId/change-requests', async (req, res) => {
  try {
    const {
      change_type,
      title,
      description,
      scope_impact,
      cost_impact,
      timeline_impact_days,
      original_contract_value,
      revised_contract_value,
      requested_by,
      approval_workflow,
    } = req.body;

    if (!change_type || !title) {
      return res.status(400).json({ error: 'Change type and title are required' });
    }

    // Generate change code if not provided
    let changeCode = req.body.change_code;
    if (!changeCode) {
      const project = await pool.query('SELECT code FROM projects WHERE id = $1', [
        req.params.projectId,
      ]);
      const projectCode = project.rows[0]?.code || 'PROJ';
      const count = await pool.query(
        'SELECT COUNT(*) as count FROM project_change_requests WHERE project_id = $1',
        [req.params.projectId]
      );
      const num = parseInt(count.rows[0]?.count || '0') + 1;
      changeCode = `${projectCode}-CR-${num.toString().padStart(4, '0')}`;
    }

    const result = await pool.query(
      `INSERT INTO project_change_requests (
        project_id, change_code, change_type, title, description,
        scope_impact, cost_impact, timeline_impact_days,
        original_contract_value, revised_contract_value, requested_by, 
        approval_workflow, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft')
      RETURNING *`,
      [
        req.params.projectId,
        changeCode,
        change_type,
        title,
        description,
        scope_impact,
        cost_impact || 0,
        timeline_impact_days || 0,
        original_contract_value,
        revised_contract_value,
        requested_by,
        approval_workflow ? JSON.stringify(approval_workflow) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Change code already exists' });
    }
    console.error('Error creating change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update change request
router.put('/change-requests/:id', async (req, res) => {
  try {
    const {
      change_type,
      title,
      description,
      scope_impact,
      cost_impact,
      timeline_impact_days,
      original_contract_value,
      revised_contract_value,
      status,
      approved_by,
      approval_workflow,
      implementation_date,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      change_type,
      title,
      description,
      scope_impact,
      cost_impact,
      timeline_impact_days,
      original_contract_value,
      revised_contract_value,
      status,
      approved_by,
      approval_workflow: approval_workflow ? JSON.stringify(approval_workflow) : undefined,
      implementation_date,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Handle approval
    if (status === 'approved' && approved_by) {
      updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_change_requests SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete change request
router.delete('/change-requests/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM project_change_requests WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    res.json({ message: 'Change request deleted successfully' });
  } catch (error) {
    console.error('Error deleting change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

