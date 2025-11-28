import express from 'express';
import pool from '../database/connection.js';

const router = express.Router();

// ============================================
// AGILE ANALYTICS - Burndown, Velocity, Throughput
// ============================================

// Get Sprint Burndown Chart Data
router.get('/sprints/:id/burndown', async (req, res) => {
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

    // Get burndown data
    const burndownResult = await pool.query(
      `SELECT * FROM burndown_data
       WHERE sprint_id = $1
       ORDER BY date`,
      [sprintId]
    );

    // Calculate ideal burndown line
    const totalStoryPoints = await pool.query(
      `SELECT COALESCE(SUM(i.story_points), 0) as total
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       WHERE si.sprint_id = $1`,
      [sprintId]
    );

    const totalPoints = parseFloat(totalStoryPoints.rows[0]?.total || '0');
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate ideal burndown line
    const idealBurndown = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      idealBurndown.push({
        date: date.toISOString().split('T')[0],
        ideal_remaining: Math.max(0, totalPoints - (totalPoints / days) * i),
      });
    }

    res.json({
      sprint,
      burndown_data: burndownResult.rows,
      ideal_burndown: idealBurndown,
      total_story_points: totalPoints,
    });
  } catch (error) {
    console.error('Error fetching burndown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate/Update Burndown Data (usually called daily via cron)
router.post('/sprints/:id/burndown/generate', async (req, res) => {
  try {
    const sprintId = req.params.id;
    const date = req.body.date || new Date().toISOString().split('T')[0];

    // Get sprint details
    const sprintResult = await pool.query(
      'SELECT * FROM sprints WHERE id = $1',
      [sprintId]
    );

    if (sprintResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sprint not found' });
    }

    // Calculate remaining and completed story points
    const remainingResult = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN i.status != 'Done' THEN i.story_points ELSE 0 END), 0) as remaining_points,
         COUNT(CASE WHEN i.status != 'Done' THEN 1 END) as remaining_tasks
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       WHERE si.sprint_id = $1`,
      [sprintId]
    );

    const completedResult = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN i.status = 'Done' THEN i.story_points ELSE 0 END), 0) as completed_points,
         COUNT(CASE WHEN i.status = 'Done' THEN 1 END) as completed_tasks
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       WHERE si.sprint_id = $1`,
      [sprintId]
    );

    const remaining = remainingResult.rows[0];
    const completed = completedResult.rows[0];

    // Insert or update burndown data
    const result = await pool.query(
      `INSERT INTO burndown_data (
        sprint_id, date, remaining_story_points, remaining_tasks,
        completed_story_points, completed_tasks
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (sprint_id, date)
      DO UPDATE SET
        remaining_story_points = EXCLUDED.remaining_story_points,
        remaining_tasks = EXCLUDED.remaining_tasks,
        completed_story_points = EXCLUDED.completed_story_points,
        completed_tasks = EXCLUDED.completed_tasks
      RETURNING *`,
      [
        sprintId,
        date,
        remaining.remaining_points,
        parseInt(remaining.remaining_tasks || '0'),
        completed.completed_points,
        parseInt(completed.completed_tasks || '0'),
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating burndown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Sprint Burnup Chart Data
router.get('/sprints/:id/burnup', async (req, res) => {
  try {
    const sprintId = req.params.id;

    const burndownResult = await pool.query(
      `SELECT 
         date,
         completed_story_points,
         completed_tasks,
         remaining_story_points + completed_story_points as total_story_points
       FROM burndown_data
       WHERE sprint_id = $1
       ORDER BY date`,
      [sprintId]
    );

    res.json(burndownResult.rows);
  } catch (error) {
    console.error('Error fetching burnup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Project Velocity
router.get('/projects/:projectId/velocity', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get velocity data from closed sprints
    const velocityResult = await pool.query(
      `SELECT 
         s.id,
         s.name,
         s.start_date,
         s.end_date,
         s.completed_date,
         COALESCE(v.completed_story_points, 0) as velocity,
         COALESCE(v.completed_issues, 0) as completed_issues,
         COALESCE(v.planned_story_points, 0) as planned_story_points,
         COALESCE(v.planned_issues, 0) as planned_issues
       FROM sprints s
       LEFT JOIN velocity_data v ON s.id = v.sprint_id
       WHERE s.project_id = $1 AND s.state = 'closed'
       ORDER BY s.end_date DESC
       LIMIT $2`,
      [req.params.projectId, limit]
    );

    // Calculate average velocity
    const avgVelocity = await pool.query(
      `SELECT 
         AVG(COALESCE(v.completed_story_points, 0)) as avg_velocity,
         AVG(COALESCE(v.completed_issues, 0)) as avg_issues
       FROM sprints s
       LEFT JOIN velocity_data v ON s.id = v.sprint_id
       WHERE s.project_id = $1 AND s.state = 'closed'`,
      [req.params.projectId]
    );

    res.json({
      sprints: velocityResult.rows,
      average_velocity: parseFloat(avgVelocity.rows[0]?.avg_velocity || '0'),
      average_issues: parseFloat(avgVelocity.rows[0]?.avg_issues || '0'),
    });
  } catch (error) {
    console.error('Error fetching velocity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate and Store Velocity for a Sprint
router.post('/sprints/:id/velocity/calculate', async (req, res) => {
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

    // Calculate completed story points and issues
    const completedResult = await pool.query(
      `SELECT 
         COALESCE(SUM(i.story_points), 0) as completed_points,
         COUNT(*) as completed_issues
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       WHERE si.sprint_id = $1 AND i.status = 'Done'`,
      [sprintId]
    );

    // Calculate planned story points and issues
    const plannedResult = await pool.query(
      `SELECT 
         COALESCE(SUM(i.story_points), 0) as planned_points,
         COUNT(*) as planned_issues
       FROM sprint_issues si
       JOIN issues i ON si.issue_id = i.id
       WHERE si.sprint_id = $1`,
      [sprintId]
    );

    const completed = completedResult.rows[0];
    const planned = plannedResult.rows[0];

    // Insert or update velocity data
    const result = await pool.query(
      `INSERT INTO velocity_data (
        project_id, sprint_id, completed_story_points, completed_issues,
        planned_story_points, planned_issues
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
      RETURNING *`,
      [
        sprintResult.rows[0].project_id,
        sprintId,
        completed.completed_points,
        parseInt(completed.completed_issues || '0'),
        planned.planned_points,
        parseInt(planned.planned_issues || '0'),
      ]
    );

    // If no conflict, try update
    if (result.rows.length === 0) {
      const updateResult = await pool.query(
        `UPDATE velocity_data
         SET completed_story_points = $1,
             completed_issues = $2,
             planned_story_points = $3,
             planned_issues = $4
         WHERE sprint_id = $5
         RETURNING *`,
        [
          completed.completed_points,
          parseInt(completed.completed_issues || '0'),
          planned.planned_points,
          parseInt(planned.planned_issues || '0'),
          sprintId,
        ]
      );
      return res.json(updateResult.rows[0] || { message: 'Velocity calculated' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error calculating velocity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Throughput Metrics (Issues completed per time period)
router.get('/projects/:projectId/throughput', async (req, res) => {
  try {
    const { period = 'week', limit = 12 } = req.query;

    let dateGroup: string;
    let interval: string;

    switch (period) {
      case 'day':
        dateGroup = "DATE(i.resolved_at)";
        interval = '1 day';
        break;
      case 'week':
        dateGroup = "DATE_TRUNC('week', i.resolved_at)";
        interval = '1 week';
        break;
      case 'month':
        dateGroup = "DATE_TRUNC('month', i.resolved_at)";
        interval = '1 month';
        break;
      default:
        dateGroup = "DATE_TRUNC('week', i.resolved_at)";
        interval = '1 week';
    }

    const throughputResult = await pool.query(
      `SELECT 
         ${dateGroup} as period,
         COUNT(*) as issues_completed,
         COALESCE(SUM(i.story_points), 0) as story_points_completed
       FROM issues i
       JOIN sprint_issues si ON i.id = si.issue_id
       JOIN sprints s ON si.sprint_id = s.id
       WHERE s.project_id = $1 
         AND i.status = 'Done'
         AND i.resolved_at IS NOT NULL
       GROUP BY ${dateGroup}
       ORDER BY period DESC
       LIMIT $2`,
      [req.params.projectId, limit]
    );

    res.json(throughputResult.rows);
  } catch (error) {
    console.error('Error fetching throughput:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Release Burndown
router.get('/releases/:id/burndown', async (req, res) => {
  try {
    const releaseId = req.params.id;

    // Get release details
    const releaseResult = await pool.query(
      'SELECT * FROM releases WHERE id = $1',
      [releaseId]
    );

    if (releaseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Release not found' });
    }

    const release = releaseResult.rows[0];

    // Get issues in this release
    const issuesResult = await pool.query(
      `SELECT 
         i.*,
         CASE WHEN i.status = 'Done' THEN 0 ELSE i.story_points END as remaining_points
       FROM issues i
       WHERE i.fix_version = $1
       ORDER BY i.created_at`,
      [release.version]
    );

    // Calculate burndown by date
    const burndownByDate: any = {};
    let totalPoints = 0;
    let remainingPoints = 0;

    issuesResult.rows.forEach((issue: any) => {
      totalPoints += issue.story_points || 0;
      remainingPoints += issue.remaining_points || 0;

      const date = issue.updated_at ? new Date(issue.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      if (!burndownByDate[date]) {
        burndownByDate[date] = { date, remaining: 0, completed: 0 };
      }
      burndownByDate[date].remaining = remainingPoints;
      burndownByDate[date].completed = totalPoints - remainingPoints;
    });

    const burndownData = Object.values(burndownByDate).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      release,
      burndown_data: burndownData,
      total_story_points: totalPoints,
      remaining_story_points: remainingPoints,
      completed_story_points: totalPoints - remainingPoints,
    });
  } catch (error) {
    console.error('Error fetching release burndown:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

