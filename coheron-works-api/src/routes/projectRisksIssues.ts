import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// RISK REGISTER
// ============================================

// Get project risks
router.get('/:projectId/risks', async (req, res) => {
  try {
    const { status, category, min_risk_score } = req.query;
    let query = `
      SELECT pr.*, 
             u.name as owner_name
      FROM project_risks pr
      LEFT JOIN users u ON pr.owner_id = u.id
      WHERE pr.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND pr.status = $${paramCount++}`;
      params.push(status);
    }

    if (category) {
      query += ` AND pr.category = $${paramCount++}`;
      params.push(category);
    }

    if (min_risk_score) {
      query += ` AND pr.risk_score >= $${paramCount++}`;
      params.push(min_risk_score);
    }

    query += ' ORDER BY pr.risk_score DESC, pr.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching risks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get risk by ID
router.get('/risks/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, 
              u.name as owner_name,
              u.email as owner_email
       FROM project_risks pr
       LEFT JOIN users u ON pr.owner_id = u.id
       WHERE pr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching risk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create risk
router.post('/:projectId/risks', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      probability,
      impact,
      status,
      mitigation_plan,
      mitigation_owner,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Risk title is required' });
    }

    const result = await pool.query(
      `INSERT INTO project_risks (
        project_id, title, description, category,
        probability, impact, status, mitigation_plan, mitigation_owner
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.params.projectId,
        title,
        description,
        category,
        probability || 3,
        impact || 3,
        status || 'identified',
        mitigation_plan,
        req.body.mitigation_owner || req.body.owner_id,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating risk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update risk
router.put('/risks/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      probability,
      impact,
      status,
      mitigation_plan,
      residual_risk_score,
      mitigation_owner,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      title,
      description,
      category,
      probability,
      impact,
      status,
      mitigation_plan,
      residual_risk_score,
      mitigation_owner,
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
    const query = `UPDATE project_risks SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating risk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete risk
router.delete('/risks/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM project_risks WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Risk not found' });
    }

    res.json({ message: 'Risk deleted successfully' });
  } catch (error) {
    console.error('Error deleting risk:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get risk heat map data
router.get('/:projectId/risks/heatmap', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         probability,
         impact,
         COUNT(*) as risk_count,
         JSON_AGG(
           JSON_BUILD_OBJECT(
             'id', id,
             'title', title,
             'status', status,
             'category', category
           )
         ) as risks
       FROM project_risks
       WHERE project_id = $1
       GROUP BY probability, impact
       ORDER BY probability DESC, impact DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching risk heatmap:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ISSUE TRACKING
// ============================================

// Get project issues
router.get('/:projectId/issues', async (req, res) => {
  try {
    const { status, severity, priority, assigned_to } = req.query;
    let query = `
      SELECT pi.*, 
             u1.name as reported_by_name,
             u2.name as assigned_to_name,
             t.name as task_name
      FROM project_issues pi
      LEFT JOIN users u1 ON pi.reported_by = u1.id
      LEFT JOIN users u2 ON pi.assigned_to = u2.id
      LEFT JOIN project_tasks t ON pi.task_id = t.id
      WHERE pi.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND pi.status = $${paramCount++}`;
      params.push(status);
    }

    if (severity) {
      query += ` AND pi.severity = $${paramCount++}`;
      params.push(severity);
    }

    if (priority) {
      query += ` AND pi.priority = $${paramCount++}`;
      params.push(priority);
    }

    if (assigned_to) {
      query += ` AND pi.assigned_to = $${paramCount++}`;
      params.push(assigned_to);
    }

    query += ` ORDER BY 
      CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      CASE priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      pi.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching issues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get issue by ID
router.get('/issues/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pi.*, 
              u1.name as reported_by_name,
              u1.email as reported_by_email,
              u2.name as assigned_to_name,
              u2.email as assigned_to_email,
              t.name as task_name
       FROM project_issues pi
       LEFT JOIN users u1 ON pi.reported_by = u1.id
       LEFT JOIN users u2 ON pi.assigned_to = u2.id
       LEFT JOIN project_tasks t ON pi.task_id = t.id
       WHERE pi.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching issue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create issue
router.post('/:projectId/issues', async (req, res) => {
  try {
    // Check if this is for the 'issues' table (has summary) or 'project_issues' table (has title)
    if (req.body.summary && !req.body.title) {
      // Handle issues table format (agile/scrum issues)
      const {
        summary,
        description,
        issue_type_id,
        priority,
        story_points,
        assignee_id,
        reporter_id,
        labels,
        components,
        fix_version,
        due_date,
        time_estimate,
      } = req.body;

      if (!summary) {
        return res.status(400).json({ error: 'Summary is required' });
      }

      // Get project key
      const projectResult = await pool.query('SELECT key FROM projects WHERE id = $1', [
        req.params.projectId,
      ]);

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const projectKey = projectResult.rows[0].key;

      // Get next issue number
      const nextNumberResult = await pool.query(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM '[0-9]+$') AS INTEGER)), 0) + 1 as next_num
         FROM issues
         WHERE project_id = $1`,
        [req.params.projectId]
      );

      const nextNum = nextNumberResult.rows[0].next_num;
      const issueKey = `${projectKey}-${nextNum}`;

      // Get default issue type if not provided
      let issueTypeId = issue_type_id;
      if (!issueTypeId) {
        const defaultTypeResult = await pool.query(
          "SELECT id FROM issue_types WHERE name = 'Task' AND is_active = true LIMIT 1"
        );
        if (defaultTypeResult.rows.length > 0) {
          issueTypeId = defaultTypeResult.rows[0].id;
        } else {
          // Get first active issue type
          const firstTypeResult = await pool.query(
            "SELECT id FROM issue_types WHERE is_active = true LIMIT 1"
          );
          if (firstTypeResult.rows.length > 0) {
            issueTypeId = firstTypeResult.rows[0].id;
          } else {
            return res.status(400).json({ error: 'No issue types found. Please create an issue type first.' });
          }
        }
      }

      // Create issue in issues table
      const issueResult = await pool.query(
        `INSERT INTO issues (
          project_id, issue_type_id, key, summary, description, priority,
          assignee_id, reporter_id, labels, components, fix_version,
          due_date, story_points, time_estimate, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'To Do')
        RETURNING *`,
        [
          req.params.projectId,
          issueTypeId,
          issueKey,
          summary,
          description || null,
          priority || 'medium',
          assignee_id || null,
          reporter_id || null,
          labels && Array.isArray(labels) ? labels : (labels ? [labels] : []),
          components && Array.isArray(components) ? components : (components ? [components] : []),
          fix_version || null,
          due_date || null,
          story_points || null,
          time_estimate || null,
        ]
      );

      const issue = issueResult.rows[0];

      // Add to backlog
      await pool.query(
        `INSERT INTO backlog (project_id, issue_id, priority, rank)
         VALUES ($1, $2, 0, NULL)
         ON CONFLICT DO NOTHING`,
        [req.params.projectId, issue.id]
      );

      return res.status(201).json(issue);
    } else {
      // Handle project_issues table format (traditional project issues)
      const {
        task_id,
        title,
        description,
        severity,
        priority,
        status,
        reported_by,
        assigned_to,
        sla_deadline,
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Issue title is required' });
      }

      const result = await pool.query(
        `INSERT INTO project_issues (
          project_id, task_id, title, description,
          severity, priority, status, reported_by, assigned_to, sla_deadline
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          req.params.projectId,
          task_id || null,
          title,
          description || null,
          severity || 'medium',
          priority || 'medium',
          status || 'open',
          reported_by || null,
          assigned_to || null,
          sla_deadline || null,
        ]
      );

      return res.status(201).json(result.rows[0]);
    }
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Issue key already exists' });
    }
    console.error('Error creating issue:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update issue
router.put('/issues/:id', async (req, res) => {
  try {
    const {
      task_id,
      title,
      description,
      severity,
      priority,
      status,
      assigned_to,
      sla_deadline,
      resolution,
      root_cause,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      task_id,
      title,
      description,
      severity,
      priority,
      status,
      assigned_to,
      sla_deadline,
      resolution,
      root_cause,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        params.push(value);
      }
    });

    // Auto-set resolved_at when status changes to resolved
    if (status === 'resolved' && !req.body.resolved_at) {
      updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
      if (assigned_to) {
        updateFields.push(`resolved_by = $${paramCount++}`);
        params.push(assigned_to);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const query = `UPDATE project_issues SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating issue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete issue
router.delete('/issues/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM project_issues WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    res.json({ message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Error deleting issue:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CHANGE REQUESTS
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
      change_number,
      change_type,
      title,
      description,
      reason,
      scope_impact,
      cost_impact,
      schedule_impact_days,
      original_contract_value,
      revised_contract_value,
      requested_by,
    } = req.body;

    if (!change_type || !title) {
      return res.status(400).json({ error: 'Change type and title are required' });
    }

    // Generate change number if not provided
    let finalChangeNumber = change_number;
    if (!finalChangeNumber) {
      const project = await pool.query('SELECT code FROM projects WHERE id = $1', [
        req.params.projectId,
      ]);
      const projectCode = project.rows[0]?.code || 'PROJ';
      const count = await pool.query(
        'SELECT COUNT(*) as count FROM project_change_requests WHERE project_id = $1',
        [req.params.projectId]
      );
      const num = parseInt(count.rows[0]?.count || '0') + 1;
      finalChangeNumber = `${projectCode}-CR-${num.toString().padStart(4, '0')}`;
    }

    const result = await pool.query(
      `INSERT INTO project_change_requests (
        project_id, change_code, change_type, title, description,
        scope_impact, cost_impact, timeline_impact_days,
        original_contract_value, revised_contract_value, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft')
      RETURNING *`,
      [
        req.params.projectId,
        finalChangeNumber,
        change_type,
        title,
        description || req.body.reason,
        scope_impact,
        cost_impact || 0,
        req.body.schedule_impact_days || req.body.timeline_impact_days || 0,
        original_contract_value,
        revised_contract_value,
        requested_by,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Change number already exists' });
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
      reason,
      scope_impact,
      cost_impact,
      schedule_impact_days,
      original_contract_value,
      revised_contract_value,
      status,
      approved_by,
    } = req.body;

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const fields = {
      change_type,
      title,
      description,
      reason,
      scope_impact,
      cost_impact,
      schedule_impact_days,
      original_contract_value,
      revised_contract_value,
      status,
      approved_by,
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

