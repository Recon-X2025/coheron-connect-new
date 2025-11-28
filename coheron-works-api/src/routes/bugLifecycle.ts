import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// BUG/DEFECT LIFECYCLE MANAGEMENT
// ============================================

// Get Bugs for a Project
router.get('/projects/:projectId/bugs', async (req, res) => {
  try {
    const { status, severity, assignee_id, release_version } = req.query;

    let query = `
      SELECT 
        i.*,
        it.name as issue_type_name,
        u1.name as assignee_name,
        u2.name as reporter_name,
        r.version as release_version
      FROM issues i
      JOIN issue_types it ON i.issue_type_id = it.id
      LEFT JOIN users u1 ON i.assignee_id = u1.id
      LEFT JOIN users u2 ON i.reporter_id = u2.id
      LEFT JOIN releases r ON i.fix_version = r.version
      WHERE i.project_id = $1 AND it.name = 'Bug'
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    if (assignee_id) {
      query += ` AND i.assignee_id = $${paramCount++}`;
      params.push(assignee_id);
    }

    if (release_version) {
      query += ` AND i.fix_version = $${paramCount++}`;
      params.push(release_version);
    }

    query += ' ORDER BY i.created_at DESC';

    const result = await pool.query(query, params);

    // Group by severity if labels contain severity info
    const groupedBySeverity = result.rows.reduce((acc: any, bug: any) => {
      const severity = bug.labels?.find((l: string) => l.startsWith('severity:')) || 'unknown';
      if (!acc[severity]) {
        acc[severity] = [];
      }
      acc[severity].push(bug);
      return acc;
    }, {});

    res.json({
      bugs: result.rows,
      grouped_by_severity: groupedBySeverity,
      total_count: result.rows.length,
      open_count: result.rows.filter((b: any) => b.status !== 'Done').length,
      resolved_count: result.rows.filter((b: any) => b.status === 'Done').length,
    });
  } catch (error) {
    console.error('Error fetching bugs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Bug by ID with Full Lifecycle
router.get('/bugs/:id', async (req, res) => {
  try {
    // Get bug details
    const bugResult = await pool.query(
      `SELECT 
         i.*,
         it.name as issue_type_name,
         u1.name as assignee_name,
         u2.name as reporter_name
       FROM issues i
       JOIN issue_types it ON i.issue_type_id = it.id
       LEFT JOIN users u1 ON i.assignee_id = u1.id
       LEFT JOIN users u2 ON i.reporter_id = u2.id
       WHERE i.id = $1 AND it.name = 'Bug'`,
      [req.params.id]
    );

    if (bugResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    const bug = bugResult.rows[0];

    // Get bug history
    const historyResult = await pool.query(
      `SELECT * FROM issue_history
       WHERE issue_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    // Get comments
    const commentsResult = await pool.query(
      `SELECT ic.*, u.name as user_name
       FROM issue_comments ic
       LEFT JOIN users u ON ic.user_id = u.id
       WHERE ic.issue_id = $1
       ORDER BY ic.created_at`,
      [req.params.id]
    );

    // Get attachments
    const attachmentsResult = await pool.query(
      `SELECT * FROM issue_attachments
       WHERE issue_id = $1
       ORDER BY created_at`,
      [req.params.id]
    );

    // Get related issues (duplicates, related bugs)
    const relatedResult = await pool.query(
      `SELECT i.*, it.name as issue_type_name
       FROM issues i
       JOIN issue_types it ON i.issue_type_id = it.id
       WHERE i.project_id = $1
         AND i.id != $2
         AND (
           i.summary ILIKE '%' || $3 || '%'
           OR i.description ILIKE '%' || $3 || '%'
         )
       LIMIT 5`,
      [bug.project_id, req.params.id, bug.summary.substring(0, 20)]
    );

    res.json({
      ...bug,
      history: historyResult.rows,
      comments: commentsResult.rows,
      attachments: attachmentsResult.rows,
      related_issues: relatedResult.rows,
    });
  } catch (error) {
    console.error('Error fetching bug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create Bug
router.post('/projects/:projectId/bugs', async (req, res) => {
  try {
    const {
      summary,
      description,
      priority,
      assignee_id,
      reporter_id,
      labels,
      components,
      fix_version,
      due_date,
      story_points,
      time_estimate,
    } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    // Get Bug issue type
    const bugTypeResult = await pool.query(
      "SELECT id FROM issue_types WHERE name = 'Bug' AND is_active = true LIMIT 1"
    );

    if (bugTypeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Bug issue type not found. Please create it first.' });
    }

    const bugTypeId = bugTypeResult.rows[0].id;

    // Generate issue key
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

    // Create issue
    const issueResult = await pool.query(
      `INSERT INTO issues (
        project_id, issue_type_id, key, summary, description, priority,
        assignee_id, reporter_id, labels, components, fix_version,
        due_date, story_points, time_estimate, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'To Do')
      RETURNING *`,
      [
        req.params.projectId,
        bugTypeId,
        issueKey,
        summary,
        description,
        priority || 'medium',
        assignee_id,
        reporter_id,
        labels || [],
        components || [],
        fix_version,
        due_date,
        story_points,
        time_estimate,
      ]
    );

    const bug = issueResult.rows[0];

    // Add to backlog
    await pool.query(
      `INSERT INTO backlog (project_id, issue_id, priority, rank)
       VALUES ($1, $2, 0, NULL)
       ON CONFLICT DO NOTHING`,
      [req.params.projectId, bug.id]
    );

    // Create history entry
    await pool.query(
      `INSERT INTO issue_history (issue_id, field_name, new_value, changed_by)
       VALUES ($1, 'status', 'To Do', $2)`,
      [bug.id, reporter_id]
    );

    res.status(201).json(bug);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Issue key already exists' });
    }
    console.error('Error creating bug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Bug Status (with lifecycle tracking)
router.put('/bugs/:id/status', async (req, res) => {
  try {
    const { status, resolution, resolved_by } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Get current bug
    const bugResult = await pool.query(
      `SELECT status, resolution FROM issues i
       JOIN issue_types it ON i.issue_type_id = it.id
       WHERE i.id = $1 AND it.name = 'Bug'`,
      [req.params.id]
    );

    if (bugResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    const currentStatus = bugResult.rows[0].status;
    const updateFields: string[] = ['status = $1'];
    const params: any[] = [status];
    let paramCount = 2;

    if (resolution) {
      updateFields.push(`resolution = $${paramCount++}`);
      params.push(resolution);
    }

    if (status === 'Done' && !bugResult.rows[0].resolution) {
      updateFields.push(`resolved_at = CURRENT_TIMESTAMP`);
    }

    params.push(req.params.id);
    const query = `UPDATE issues SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, params);

    // Create history entry
    await pool.query(
      `INSERT INTO issue_history (issue_id, field_name, old_value, new_value, changed_by)
       VALUES ($1, 'status', $2, $3, $4)`,
      [req.params.id, currentStatus, status, resolved_by]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bug status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Bug Statistics
router.get('/projects/:projectId/bugs/statistics', async (req, res) => {
  try {
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) as total_bugs,
         COUNT(CASE WHEN i.status != 'Done' THEN 1 END) as open_bugs,
         COUNT(CASE WHEN i.status = 'Done' THEN 1 END) as resolved_bugs,
         COUNT(CASE WHEN i.priority = 'highest' OR i.priority = 'high' THEN 1 END) as critical_bugs,
         AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 86400) as avg_resolution_days,
         COUNT(CASE WHEN i.resolved_at IS NOT NULL 
           AND EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 86400 > 7 THEN 1 END) as bugs_over_week
       FROM issues i
       JOIN issue_types it ON i.issue_type_id = it.id
       WHERE i.project_id = $1 AND it.name = 'Bug'`,
      [req.params.projectId]
    );

    // Bugs by status
    const byStatusResult = await pool.query(
      `SELECT i.status, COUNT(*) as count
       FROM issues i
       JOIN issue_types it ON i.issue_type_id = it.id
       WHERE i.project_id = $1 AND it.name = 'Bug'
       GROUP BY i.status`,
      [req.params.projectId]
    );

    // Bugs by priority
    const byPriorityResult = await pool.query(
      `SELECT i.priority, COUNT(*) as count
       FROM issues i
       JOIN issue_types it ON i.issue_type_id = it.id
       WHERE i.project_id = $1 AND it.name = 'Bug'
       GROUP BY i.priority`,
      [req.params.projectId]
    );

    res.json({
      summary: statsResult.rows[0],
      by_status: byStatusResult.rows,
      by_priority: byPriorityResult.rows,
    });
  } catch (error) {
    console.error('Error fetching bug statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

