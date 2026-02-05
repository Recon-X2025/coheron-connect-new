import express from 'express';
import mongoose from 'mongoose';
import Sprint from '../../../models/Sprint.js';
import SprintIssue from '../../../models/SprintIssue.js';
import SprintBurndown from '../../../models/SprintBurndown.js';
import VelocityData from '../../../models/VelocityData.js';
import Issue from '../../../models/Issue.js';
import Release from '../../../models/Release.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();
router.use(authenticate);

// ============================================
// AGILE ANALYTICS - Burndown, Velocity, Throughput
// ============================================

// Get Sprint Burndown Chart Data
router.get('/sprints/:id/burndown', asyncHandler(async (req, res) => {
  const sprintId = req.params.id;

  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const burndownData = await SprintBurndown.find({ sprint_id: sprintId }).sort({ date: 1 }).lean();

  // Calculate total story points
  const sprintIssues = await SprintIssue.find({ sprint_id: sprintId }).populate('issue_id', 'story_points').lean();
  const totalPoints = sprintIssues.reduce((sum: number, si: any) => sum + (si.issue_id?.story_points || 0), 0);

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
    burndown_data: burndownData,
    ideal_burndown: idealBurndown,
    total_story_points: totalPoints,
  });
}));

// Generate/Update Burndown Data
router.post('/sprints/:id/burndown/generate', asyncHandler(async (req, res) => {
  const sprintId = req.params.id;
  const date = req.body.date || new Date().toISOString().split('T')[0];

  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  // Get sprint issues
  const sprintIssues = await SprintIssue.find({ sprint_id: sprintId }).populate('issue_id').lean();

  let remainingPoints = 0;
  let remainingTasks = 0;
  let completedPoints = 0;
  let completedTasks = 0;

  for (const si of sprintIssues) {
    const issue = si.issue_id as any;
    if (!issue) continue;
    if (issue.status === 'Done') {
      completedPoints += issue.story_points || 0;
      completedTasks++;
    } else {
      remainingPoints += issue.story_points || 0;
      remainingTasks++;
    }
  }

  const burndown = await SprintBurndown.findOneAndUpdate(
    { sprint_id: sprintId, date: new Date(date) },
    {
      sprint_id: sprintId,
      date: new Date(date),
      remaining_story_points: remainingPoints,
      remaining_tasks: remainingTasks,
      completed_story_points: completedPoints,
      completed_tasks: completedTasks,
    },
    { upsert: true, new: true }
  );

  res.json(burndown);
}));

// Get Sprint Burnup Chart Data
router.get('/sprints/:id/burnup', asyncHandler(async (req, res) => {
  const burndownData = await SprintBurndown.find({ sprint_id: req.params.id }).sort({ date: 1 }).lean();

  const result = burndownData.map((d: any) => ({
    date: d.date,
    completed_story_points: d.completed_story_points,
    completed_tasks: d.completed_tasks,
    total_story_points: d.remaining_story_points + d.completed_story_points,
  }));

  res.json(result);
}));

// Get Project Velocity
router.get('/projects/:projectId/velocity', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const sprints = await Sprint.find({
    project_id: req.params.projectId,
    state: 'closed',
  }).sort({ end_date: -1 }).limit(parseInt(limit as string)).lean();

  const sprintIds = sprints.map(s => s._id);

  const velocityData = await VelocityData.find({ sprint_id: { $in: sprintIds } }).lean();
  const velocityMap = new Map(velocityData.map(v => [v.sprint_id.toString(), v]));

  const result = sprints.map(s => {
    const v = velocityMap.get(s._id.toString());
    return {
      id: s._id,
      name: s.name,
      start_date: s.start_date,
      end_date: s.end_date,
      velocity: (v as any)?.completed_story_points || 0,
      completed_issues: (v as any)?.completed_issues || 0,
      planned_story_points: (v as any)?.planned_story_points || 0,
      planned_issues: (v as any)?.planned_issues || 0,
    };
  });

  const avgVelocity = result.length > 0
    ? result.reduce((sum, r) => sum + r.velocity, 0) / result.length
    : 0;
  const avgIssues = result.length > 0
    ? result.reduce((sum, r) => sum + r.completed_issues, 0) / result.length
    : 0;

  res.json({
    sprints: result,
    average_velocity: avgVelocity,
    average_issues: avgIssues,
  });
}));

// Calculate and Store Velocity for a Sprint
router.post('/sprints/:id/velocity/calculate', asyncHandler(async (req, res) => {
  const sprintId = req.params.id;

  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const sprintIssues = await SprintIssue.find({ sprint_id: sprintId }).populate('issue_id').lean();

  let completedPoints = 0;
  let completedIssues = 0;
  let plannedPoints = 0;
  let plannedIssues = sprintIssues.length;

  for (const si of sprintIssues) {
    const issue = si.issue_id as any;
    if (!issue) continue;
    plannedPoints += issue.story_points || 0;
    if (issue.status === 'Done') {
      completedPoints += issue.story_points || 0;
      completedIssues++;
    }
  }

  const velocity = await VelocityData.findOneAndUpdate(
    { sprint_id: sprintId },
    {
      project_id: sprint.project_id,
      sprint_id: sprintId,
      completed_story_points: completedPoints,
      completed_issues: completedIssues,
      planned_story_points: plannedPoints,
      planned_issues: plannedIssues,
    },
    { upsert: true, new: true }
  );

  res.json(velocity);
}));

// Get Throughput Metrics
router.get('/projects/:projectId/throughput', asyncHandler(async (req, res) => {
  const { period = 'week', limit = 12 } = req.query;

  let dateFormat: string;
  switch (period) {
    case 'day':
      dateFormat = '%Y-%m-%d';
      break;
    case 'month':
      dateFormat = '%Y-%m';
      break;
    case 'week':
    default:
      dateFormat = '%Y-W%V';
  }

  // Get sprint IDs for this project
  const sprints = await Sprint.find({ project_id: req.params.projectId }).lean();
  const sprintIds = sprints.map(s => s._id);

  const sprintIssueIds = await SprintIssue.find({ sprint_id: { $in: sprintIds } }).distinct('issue_id');

  const throughput = await Issue.aggregate([
    {
      $match: {
        _id: { $in: sprintIssueIds },
        status: 'Done',
        resolved_at: { $ne: null },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$resolved_at' } },
        issues_completed: { $sum: 1 },
        story_points_completed: { $sum: { $ifNull: ['$story_points', 0] } },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: parseInt(limit as string) },
    { $project: { period: '$_id', issues_completed: 1, story_points_completed: 1, _id: 0 } },
  ]);

  res.json(throughput);
}));

// Get Release Burndown
router.get('/releases/:id/burndown', asyncHandler(async (req, res) => {
  const release = await Release.findById(req.params.id).lean();
  if (!release) {
    return res.status(404).json({ error: 'Release not found' });
  }

  const issues = await Issue.find({ fix_version: release.version }).sort({ created_at: 1 }).lean();

  let totalPoints = 0;
  let remainingPoints = 0;

  const burndownByDate: any = {};
  for (const issue of issues) {
    totalPoints += issue.story_points || 0;
    const remaining = issue.status === 'Done' ? 0 : (issue.story_points || 0);
    remainingPoints += remaining;

    const date = (issue as any).updated_at
      ? new Date((issue as any).updated_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    burndownByDate[date] = { date, remaining: remainingPoints, completed: totalPoints - remainingPoints };
  }

  const burndownData = Object.values(burndownByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));

  res.json({
    release,
    burndown_data: burndownData,
    total_story_points: totalPoints,
    remaining_story_points: remainingPoints,
    completed_story_points: totalPoints - remainingPoints,
  });
}));

export default router;
