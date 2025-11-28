import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// ENHANCED BACKLOG MANAGEMENT
// ============================================

// Get Backlog with Enhanced Filtering and Grouping
router.get('/projects/:projectId/backlog/enhanced', async (req, res) => {
  try {
    const { epic_id, issue_type, status, assignee_id, priority, search, sort_by = 'priority' } = req.query;

    let query = `
      SELECT 
        b.*,
        i.*,
        it.name as issue_type_name,
        e.name as epic_name,
        u1.name as assignee_name,
        u2.name as reporter_name
      FROM backlog b
      JOIN issues i ON b.issue_id = i.id
      LEFT JOIN issue_types it ON i.issue_type_id = it.id
      LEFT JOIN epics e ON i.epic_id = e.id
      LEFT JOIN users u1 ON i.assignee_id = u1.id
      LEFT JOIN users u2 ON i.reporter_id = u2.id
      WHERE b.project_id = $1
    `;
    const params: any[] = [req.params.projectId];
    let paramCount = 2;

    if (epic_id) {
      query += ` AND i.epic_id = $${paramCount++}`;
      params.push(epic_id);
    } else if (epic_id === null || epic_id === 'null') {
      query += ` AND i.epic_id IS NULL`;
    }

    if (issue_type) {
      query += ` AND it.name = $${paramCount++}`;
      params.push(issue_type);
    }

    if (status) {
      query += ` AND i.status = $${paramCount++}`;
      params.push(status);
    }

    if (assignee_id) {
      query += ` AND i.assignee_id = $${paramCount++}`;
      params.push(assignee_id);
    } else if (assignee_id === null || assignee_id === 'null') {
      query += ` AND i.assignee_id IS NULL`;
    }

    if (priority) {
      query += ` AND i.priority = $${paramCount++}`;
      params.push(priority);
    }

    if (search) {
      query += ` AND (i.summary ILIKE $${paramCount} OR i.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sorting
    switch (sort_by) {
      case 'priority':
        query += ' ORDER BY b.priority DESC, b.rank NULLS LAST, i.created_at';
        break;
      case 'rank':
        query += ' ORDER BY b.rank NULLS LAST, b.priority DESC';
        break;
      case 'created':
        query += ' ORDER BY i.created_at DESC';
        break;
      case 'story_points':
        query += ' ORDER BY i.story_points DESC NULLS LAST';
        break;
      default:
        query += ' ORDER BY b.priority DESC, b.rank NULLS LAST, i.created_at';
    }

    const result = await pool.query(query, params);

    // Group by epic if requested
    const grouped = result.rows.reduce((acc: any, item: any) => {
      const epicKey = item.epic_id ? `epic-${item.epic_id}` : 'no-epic';
      if (!acc[epicKey]) {
        acc[epicKey] = {
          epic_id: item.epic_id,
          epic_name: item.epic_name || 'No Epic',
          items: [],
        };
      }
      acc[epicKey].items.push(item);
      return acc;
    }, {});

    res.json({
      items: result.rows,
      grouped_by_epic: Object.values(grouped),
      total_count: result.rows.length,
      total_story_points: result.rows.reduce((sum: number, item: any) => sum + (item.story_points || 0), 0),
    });
  } catch (error) {
    console.error('Error fetching enhanced backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Backlog Priority/Rank (for drag-and-drop)
router.put('/projects/:projectId/backlog/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Array of { issue_id, priority, rank }

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    await pool.query('BEGIN');

    try {
      for (const item of items) {
        await pool.query(
          `UPDATE backlog 
           SET priority = $1, rank = $2 
           WHERE project_id = $3 AND issue_id = $4`,
          [item.priority, item.rank, req.params.projectId, item.issue_id]
        );
      }

      await pool.query('COMMIT');
      res.json({ message: 'Backlog reordered successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error reordering backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk Add Issues to Backlog
router.post('/projects/:projectId/backlog/bulk-add', async (req, res) => {
  try {
    const { issue_ids } = req.body;

    if (!Array.isArray(issue_ids) || issue_ids.length === 0) {
      return res.status(400).json({ error: 'issue_ids must be a non-empty array' });
    }

    await pool.query('BEGIN');

    try {
      const results = [];
      for (const issueId of issue_ids) {
        // Check if issue exists and belongs to project
        const issueCheck = await pool.query(
          'SELECT project_id FROM issues WHERE id = $1',
          [issueId]
        );

        if (issueCheck.rows.length === 0) {
          continue; // Skip non-existent issues
        }

        if (issueCheck.rows[0].project_id !== parseInt(req.params.projectId)) {
          continue; // Skip issues from other projects
        }

        // Remove from sprint if in one
        await pool.query('DELETE FROM sprint_issues WHERE issue_id = $1', [issueId]);

        // Add to backlog
        const result = await pool.query(
          `INSERT INTO backlog (project_id, issue_id, priority, rank)
           VALUES ($1, $2, 0, NULL)
           ON CONFLICT (project_id, issue_id) DO NOTHING
           RETURNING *`,
          [req.params.projectId, issueId]
        );

        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      }

      await pool.query('COMMIT');
      res.json({ message: `Added ${results.length} issues to backlog`, items: results });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error bulk adding to backlog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backlog Grooming - Get Unestimated Items
router.get('/projects/:projectId/backlog/grooming', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         b.*,
         i.*,
         it.name as issue_type_name,
         e.name as epic_name
       FROM backlog b
       JOIN issues i ON b.issue_id = i.id
       LEFT JOIN issue_types it ON i.issue_type_id = it.id
       LEFT JOIN epics e ON i.epic_id = e.id
       WHERE b.project_id = $1
         AND (i.story_points IS NULL OR i.story_points = 0)
         AND (i.time_estimate IS NULL OR i.time_estimate = 0)
       ORDER BY b.priority DESC, i.created_at`,
      [req.params.projectId]
    );

    res.json({
      unestimated_items: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching grooming items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Quick Filters for Backlog
router.get('/projects/:projectId/backlog/filters', async (req, res) => {
  try {
    // Get available filters
    const epicFilter = await pool.query(
      `SELECT DISTINCT e.id, e.name, COUNT(*) as count
       FROM backlog b
       JOIN issues i ON b.issue_id = i.id
       LEFT JOIN epics e ON i.epic_id = e.id
       WHERE b.project_id = $1
       GROUP BY e.id, e.name`,
      [req.params.projectId]
    );

    const typeFilter = await pool.query(
      `SELECT DISTINCT it.id, it.name, COUNT(*) as count
       FROM backlog b
       JOIN issues i ON b.issue_id = i.id
       LEFT JOIN issue_types it ON i.issue_type_id = it.id
       WHERE b.project_id = $1
       GROUP BY it.id, it.name`,
      [req.params.projectId]
    );

    const assigneeFilter = await pool.query(
      `SELECT DISTINCT u.id, u.name, COUNT(*) as count
       FROM backlog b
       JOIN issues i ON b.issue_id = i.id
       LEFT JOIN users u ON i.assignee_id = u.id
       WHERE b.project_id = $1 AND i.assignee_id IS NOT NULL
       GROUP BY u.id, u.name`,
      [req.params.projectId]
    );

    const statusFilter = await pool.query(
      `SELECT DISTINCT i.status, COUNT(*) as count
       FROM backlog b
       JOIN issues i ON b.issue_id = i.id
       WHERE b.project_id = $1
       GROUP BY i.status`,
      [req.params.projectId]
    );

    res.json({
      epics: epicFilter.rows,
      issue_types: typeFilter.rows,
      assignees: assigneeFilter.rows,
      statuses: statusFilter.rows,
    });
  } catch (error) {
    console.error('Error fetching filters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

