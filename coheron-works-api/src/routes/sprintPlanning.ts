import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// SPRINT PLANNING & CAPACITY
// ============================================

// Get Sprint Planning Data
router.get('/sprints/:id/planning', async (req, res) => {
  try {
    const sprintId = req.params.id;

    // Get sprint details
    const sprintResult = await pool.query(
      'SELECT * FROM sprints WHERE id = $1',
      [sprintId]
    );

    if (sprintResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const sprint = sprintResult.rows[0];

    // Get issues in sprint
    const issuesResult = await pool.query(
      `SELECT 
         i.*,
         it.name as issue_type_name,
         u.name as assignee_name
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       LEFT JOIN issue_types it ON i.issue_type_id = it.id
       LEFT JOIN users u ON i.assignee_id = u.id
       WHERE si.sprint_id = $1
       ORDER BY si.position, i.created_at`,
      [sprintId]
    );

    // Calculate capacity by assignee
    const capacityResult = await pool.query(
      `SELECT 
         i.assignee_id,
         u.name as assignee_name,
         COUNT(*) as issue_count,
         COALESCE(SUM(i.story_points), 0) as total_story_points,
         COALESCE(SUM(i.time_estimate), 0) as total_estimated_hours,
         COALESCE(SUM(i.time_spent), 0) as total_spent_hours
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       LEFT JOIN users u ON i.assignee_id = u.id
       WHERE si.sprint_id = $1
       GROUP BY i.assignee_id, u.name`,
      [sprintId]
    );

    // Calculate totals
    const totals = {
      total_issues: issuesResult.rows.length,
      total_story_points: issuesResult.rows.reduce((sum, issue) => sum + (issue.story_points || 0), 0),
      total_estimated_hours: issuesResult.rows.reduce((sum, issue) => sum + (issue.time_estimate || 0), 0),
      total_spent_hours: issuesResult.rows.reduce((sum, issue) => sum + (issue.time_spent || 0), 0),
    };

    res.json({
      sprint,
      issues: issuesResult.rows,
      capacity_by_assignee: capacityResult.rows,
      totals,
    });
  } catch (error) {
    console.error('Error fetching sprint planning:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Issue to Sprint
router.post('/sprints/:id/issues', async (req, res) => {
  try {
    const { issue_id, position } = req.body;

    if (!issue_id) {
      return res.status(400).json({ error: 'issue_id is required' });
    }

    // Verify sprint exists
    const sprintCheck = await pool.query('SELECT id FROM sprints WHERE id = $1', [
      req.params.id,
    ]);

    if (sprintCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Verify issue exists
    const issueCheck = await pool.query('SELECT id FROM issues WHERE id = $1', [issue_id]);

    if (issueCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Remove from backlog if exists
    await pool.query('DELETE FROM backlog WHERE issue_id = $1', [issue_id]);

    // Add to sprint
    const result = await pool.query(
      `INSERT INTO sprint_issues (sprint_id, issue_id, position)
       VALUES ($1, $2, $3)
       ON CONFLICT (sprint_id, issue_id) DO NOTHING
       RETURNING *`,
      [req.params.id, issue_id, position || null]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Issue already in sprint' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding issue to sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove Issue from Sprint (moves back to backlog)
router.delete('/sprints/:id/issues/:issueId', async (req, res) => {
  try {
    // Remove from sprint
    const result = await pool.query(
      'DELETE FROM sprint_issues WHERE sprint_id = $1 AND issue_id = $2 RETURNING *',
      [req.params.id, req.params.issueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Issue not found in sprint' });
    }

    // Get sprint project_id
    const sprintResult = await pool.query('SELECT project_id FROM sprints WHERE id = $1', [
      req.params.id,
    ]);

    if (sprintResult.rows.length > 0) {
      // Add back to backlog
      await pool.query(
        `INSERT INTO backlog (project_id, issue_id, priority, rank)
         VALUES ($1, $2, 0, NULL)
         ON CONFLICT (project_id, issue_id) DO NOTHING`,
        [sprintResult.rows[0].project_id, req.params.issueId]
      );
    }

    res.json({ message: 'Issue removed from sprint' });
  } catch (error) {
    console.error('Error removing issue from sprint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder Issues in Sprint
router.put('/sprints/:id/issues/reorder', async (req, res) => {
  try {
    const { issue_positions } = req.body; // Array of { issue_id, position }

    if (!Array.isArray(issue_positions)) {
      return res.status(400).json({ error: 'issue_positions must be an array' });
    }

    // Update positions in transaction
    await pool.query('BEGIN');

    try {
      for (const item of issue_positions) {
        await pool.query(
          'UPDATE sprint_issues SET position = $1 WHERE sprint_id = $2 AND issue_id = $3',
          [item.position, req.params.id, item.issue_id]
        );
      }

      await pool.query('COMMIT');
      res.json({ message: 'Issues reordered successfully' });
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error reordering issues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Team Capacity for Sprint
router.get('/sprints/:id/capacity', async (req, res) => {
  try {
    const sprintId = req.params.id;

    // Get sprint dates
    const sprintResult = await pool.query('SELECT * FROM sprints WHERE id = $1', [sprintId]);

    if (sprintResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    const sprint = sprintResult.rows[0];
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Get team members and their capacity
    const capacityResult = await pool.query(
      `SELECT DISTINCT
         i.assignee_id,
         u.name as assignee_name,
         COUNT(DISTINCT si.issue_id) as assigned_issues,
         COALESCE(SUM(i.story_points), 0) as assigned_story_points,
         COALESCE(SUM(i.time_estimate), 0) as assigned_hours
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       LEFT JOIN users u ON i.assignee_id = u.id
       WHERE si.sprint_id = $1 AND i.assignee_id IS NOT NULL
       GROUP BY i.assignee_id, u.name`,
      [sprintId]
    );

    // Calculate available capacity (assuming 8 hours per day)
    const capacityData = capacityResult.rows.map((member: any) => ({
      ...member,
      available_hours: days * 8, // 8 hours per day
      utilization_percentage: ((member.assigned_hours / (days * 8)) * 100).toFixed(2),
    }));

    res.json({
      sprint,
      sprint_days: days,
      team_capacity: capacityData,
      total_available_hours: days * 8 * capacityData.length,
      total_assigned_hours: capacityData.reduce((sum: number, m: any) => sum + parseFloat(m.assigned_hours || 0), 0),
    });
  } catch (error) {
    console.error('Error fetching capacity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

