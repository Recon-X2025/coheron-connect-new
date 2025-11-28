import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// INCIDENTS
// ============================================

// Get all incidents
router.get('/incidents', async (req, res) => {
  try {
    const { status, priority, impact } = req.query;
    let query = `
      SELECT i.*, 
             sa.user_id as agent_user_id,
             u.name as assigned_to_name
      FROM incidents i
      LEFT JOIN support_agents sa ON i.assigned_to = sa.id
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND i.priority = $${paramCount++}`;
      params.push(priority);
    }

    if (impact) {
      query += ` AND i.impact = $${paramCount++}`;
      params.push(impact);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create incident
router.post('/incidents', async (req, res) => {
  try {
    const {
      title,
      description,
      priority,
      impact,
      urgency,
      affected_users,
      affected_systems,
    } = req.body;

    if (!title || !description || !priority || !impact || !urgency) {
      return res.status(400).json({
        error: 'Title, description, priority, impact, and urgency are required',
      });
    }

    const incidentCount = await pool.query('SELECT COUNT(*) as count FROM incidents');
    const num = parseInt(incidentCount.rows[0]?.count || '0') + 1;
    const incidentNumber = `INC-${Date.now()}-${num.toString().padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO incidents (
        incident_number, title, description, priority, impact, urgency,
        affected_users, affected_systems
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [incidentNumber, title, description, priority, impact, urgency, affected_users, affected_systems || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update incident
router.put('/incidents/:id', async (req, res) => {
  try {
    const { status, assigned_to, resolution, resolved_at } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      params.push(status);
      if (status === 'resolved' && !resolved_at) {
        updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
      if (status === 'closed' && !resolved_at) {
        updateFields.push(`closed_at = CURRENT_TIMESTAMP`);
      }
    }
    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramCount++}`);
      params.push(assigned_to);
    }
    if (resolution !== undefined) {
      updateFields.push(`resolution = $${paramCount++}`);
      params.push(resolution);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE incidents SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PROBLEMS
// ============================================

// Get all problems
router.get('/problems', async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = `
      SELECT p.*, 
             sa.user_id as agent_user_id,
             u.name as assigned_to_name
      FROM problems p
      LEFT JOIN support_agents sa ON p.assigned_to = sa.id
      LEFT JOIN users u ON sa.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount++}`;
      params.push(status);
    }

    if (priority) {
      query += ` AND p.priority = $${paramCount++}`;
      params.push(priority);
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create problem
router.post('/problems', async (req, res) => {
  try {
    const { title, description, priority, related_incidents } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const problemCount = await pool.query('SELECT COUNT(*) as count FROM problems');
    const num = parseInt(problemCount.rows[0]?.count || '0') + 1;
    const problemNumber = `PRB-${Date.now()}-${num.toString().padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO problems (
        problem_number, title, description, priority, related_incidents
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [problemNumber, title, description, priority || 'medium', related_incidents || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update problem
router.put('/problems/:id', async (req, res) => {
  try {
    const { status, assigned_to, root_cause_analysis, solution, known_error, resolved_at } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      params.push(status);
      if (status === 'resolved' && !resolved_at) {
        updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }
    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramCount++}`);
      params.push(assigned_to);
    }
    if (root_cause_analysis !== undefined) {
      updateFields.push(`root_cause_analysis = $${paramCount++}`);
      params.push(root_cause_analysis);
    }
    if (solution !== undefined) {
      updateFields.push(`solution = $${paramCount++}`);
      params.push(solution);
    }
    if (known_error !== undefined) {
      updateFields.push(`known_error = $${paramCount++}`);
      params.push(known_error);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE problems SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CHANGE REQUESTS
// ============================================

// Get all change requests
router.get('/changes', async (req, res) => {
  try {
    const { status, change_type, priority } = req.query;
    let query = `
      SELECT cr.*, 
             u1.name as requested_by_name,
             u2.name as approved_by_name,
             u3.name as implemented_by_name
      FROM change_requests cr
      LEFT JOIN users u1 ON cr.requested_by = u1.id
      LEFT JOIN users u2 ON cr.approved_by = u2.id
      LEFT JOIN users u3 ON cr.implemented_by = u3.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND cr.status = $${paramCount++}`;
      params.push(status);
    }

    if (change_type) {
      query += ` AND cr.change_type = $${paramCount++}`;
      params.push(change_type);
    }

    if (priority) {
      query += ` AND cr.priority = $${paramCount++}`;
      params.push(priority);
    }

    query += ' ORDER BY cr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching change requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create change request
router.post('/changes', async (req, res) => {
  try {
    const {
      title,
      description,
      change_type,
      priority,
      requested_by,
      risk_level,
      impact_analysis,
      rollback_plan,
      scheduled_start,
      scheduled_end,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const changeCount = await pool.query('SELECT COUNT(*) as count FROM change_requests');
    const num = parseInt(changeCount.rows[0]?.count || '0') + 1;
    const changeNumber = `CHG-${Date.now()}-${num.toString().padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO change_requests (
        change_number, title, description, change_type, priority, requested_by,
        risk_level, impact_analysis, rollback_plan, scheduled_start, scheduled_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        changeNumber,
        title,
        description,
        change_type || 'normal',
        priority || 'medium',
        requested_by,
        risk_level || 'medium',
        impact_analysis,
        rollback_plan,
        scheduled_start,
        scheduled_end,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating change request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update change request
router.put('/changes/:id', async (req, res) => {
  try {
    const {
      status,
      approved_by,
      implemented_by,
      actual_start,
      actual_end,
      risk_level,
      impact_analysis,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramCount++}`);
      params.push(status);
    }
    if (approved_by !== undefined) {
      updateFields.push(`approved_by = $${paramCount++}`);
      params.push(approved_by);
    }
    if (implemented_by !== undefined) {
      updateFields.push(`implemented_by = $${paramCount++}`);
      params.push(implemented_by);
    }
    if (actual_start !== undefined) {
      updateFields.push(`actual_start = $${paramCount++}`);
      params.push(actual_start);
    }
    if (actual_end !== undefined) {
      updateFields.push(`actual_end = $${paramCount++}`);
      params.push(actual_end);
    }
    if (risk_level !== undefined) {
      updateFields.push(`risk_level = $${paramCount++}`);
      params.push(risk_level);
    }
    if (impact_analysis !== undefined) {
      updateFields.push(`impact_analysis = $${paramCount++}`);
      params.push(impact_analysis);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE change_requests SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

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

// Add CAB member
router.post('/changes/:id/cab', async (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const result = await pool.query(
      `INSERT INTO change_cab_members (change_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (change_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [req.params.id, user_id, role || 'reviewer']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding CAB member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject change (CAB member)
router.post('/changes/:id/cab/:memberId/approve', async (req, res) => {
  try {
    const { approval_status, comments } = req.body;

    if (!approval_status) {
      return res.status(400).json({ error: 'Approval status is required' });
    }

    const updateFields: string[] = [`approval_status = $1`];
    const params: any[] = [approval_status];

    if (comments !== undefined) {
      updateFields.push(`comments = $2`);
      params.push(comments);
    }

    if (approval_status === 'approved' || approval_status === 'rejected') {
      updateFields.push(`approved_at = CURRENT_TIMESTAMP`);
    }

    params.push(req.params.id, req.params.memberId);
    const query = `UPDATE change_cab_members SET ${updateFields.join(', ')} WHERE change_id = $3 AND id = $4 RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'CAB member not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating CAB approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

