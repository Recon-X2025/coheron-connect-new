import express from 'express';
import Sprint from '../../../models/Sprint.js';
import SprintIssue from '../../../models/SprintIssue.js';
import Issue from '../../../models/Issue.js';
import Backlog from '../../../models/Backlog.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// SPRINT PLANNING & CAPACITY
// ============================================

// Get Sprint Planning Data
router.get('/sprints/:id/planning', asyncHandler(async (req, res) => {
  const sprintId = req.params.id;

  // Get sprint details
  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  // Get issues in sprint
  const sprintIssues = await SprintIssue.find({ sprint_id: sprintId })
    .populate({
      path: 'issue_id',
      populate: [
        { path: 'issue_type_id', select: 'name' },
        { path: 'assignee_id', select: 'name' },
      ],
    })
    .sort({ position: 1 });

  const issues = sprintIssues.map((si: any) => ({
    ...si.issue_id.toObject(),
    issue_type_name: si.issue_id.issue_type_id?.name,
    assignee_name: si.issue_id.assignee_id?.name,
  }));

  // Calculate capacity by assignee
  const capacityMap: any = {};
  for (const issue of issues) {
    const key = issue.assignee_id?._id?.toString() || 'unassigned';
    if (!capacityMap[key]) {
      capacityMap[key] = {
        assignee_id: issue.assignee_id?._id || null,
        assignee_name: issue.assignee_name || 'Unassigned',
        issue_count: 0,
        total_story_points: 0,
        total_estimated_hours: 0,
        total_spent_hours: 0,
      };
    }
    capacityMap[key].issue_count++;
    capacityMap[key].total_story_points += issue.story_points || 0;
    capacityMap[key].total_estimated_hours += issue.time_estimate || 0;
    capacityMap[key].total_spent_hours += issue.time_spent || 0;
  }

  const totals = {
    total_issues: issues.length,
    total_story_points: issues.reduce((sum: number, i: any) => sum + (i.story_points || 0), 0),
    total_estimated_hours: issues.reduce((sum: number, i: any) => sum + (i.time_estimate || 0), 0),
    total_spent_hours: issues.reduce((sum: number, i: any) => sum + (i.time_spent || 0), 0),
  };

  res.json({
    sprint,
    issues,
    capacity_by_assignee: Object.values(capacityMap),
    totals,
  });
}));

// Add Issue to Sprint
router.post('/sprints/:id/issues', asyncHandler(async (req, res) => {
  const { issue_id, position } = req.body;

  if (!issue_id) {
    return res.status(400).json({ error: 'issue_id is required' });
  }

  // Verify sprint exists
  const sprint = await Sprint.findById(req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  // Verify issue exists
  const issue = await Issue.findById(issue_id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  // Remove from backlog if exists
  await Backlog.deleteOne({ issue_id });

  // Check if already in sprint
  const existing = await SprintIssue.findOne({ sprint_id: req.params.id, issue_id });
  if (existing) {
    return res.status(400).json({ error: 'Issue already in sprint' });
  }

  const sprintIssue = await SprintIssue.create({
    sprint_id: req.params.id,
    issue_id,
    position: position || null,
  });

  res.status(201).json(sprintIssue);
}));

// Remove Issue from Sprint (moves back to backlog)
router.delete('/sprints/:id/issues/:issueId', asyncHandler(async (req, res) => {
  const si = await SprintIssue.findOneAndDelete({
    sprint_id: req.params.id,
    issue_id: req.params.issueId,
  });

  if (!si) {
    return res.status(404).json({ error: 'Issue not found in sprint' });
  }

  // Get sprint project_id
  const sprint = await Sprint.findById(req.params.id);
  if (sprint) {
    // Add back to backlog
    await Backlog.findOneAndUpdate(
      { project_id: sprint.project_id, issue_id: req.params.issueId },
      { project_id: sprint.project_id, issue_id: req.params.issueId, priority: 0, rank: null },
      { upsert: true }
    );
  }

  res.json({ message: 'Issue removed from sprint' });
}));

// Reorder Issues in Sprint
router.put('/sprints/:id/issues/reorder', asyncHandler(async (req, res) => {
  const { issue_positions } = req.body;

  if (!Array.isArray(issue_positions)) {
    return res.status(400).json({ error: 'issue_positions must be an array' });
  }

  const bulkOps = issue_positions.map((item: any) => ({
    updateOne: {
      filter: { sprint_id: req.params.id, issue_id: item.issue_id },
      update: { $set: { position: item.position } },
    },
  }));

  await SprintIssue.bulkWrite(bulkOps);
  res.json({ message: 'Issues reordered successfully' });
}));

// Get Team Capacity for Sprint
router.get('/sprints/:id/capacity', asyncHandler(async (req, res) => {
  const sprintId = req.params.id;

  const sprint = await Sprint.findById(sprintId).lean();
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const startDate = new Date(sprint.start_date);
  const endDate = new Date(sprint.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Get sprint issues with assignees
  const sprintIssues = await SprintIssue.find({ sprint_id: sprintId }).populate({
    path: 'issue_id',
    match: { assignee_id: { $ne: null } },
    populate: { path: 'assignee_id', select: 'name' },
  });

  const capacityMap: any = {};
  for (const si of sprintIssues) {
    const issue = si.issue_id as any;
    if (!issue || !issue.assignee_id) continue;
    const key = issue.assignee_id._id.toString();
    if (!capacityMap[key]) {
      capacityMap[key] = {
        assignee_id: issue.assignee_id._id,
        assignee_name: issue.assignee_id.name,
        assigned_issues: 0,
        assigned_story_points: 0,
        assigned_hours: 0,
      };
    }
    capacityMap[key].assigned_issues++;
    capacityMap[key].assigned_story_points += issue.story_points || 0;
    capacityMap[key].assigned_hours += issue.time_estimate || 0;
  }

  const capacityData = Object.values(capacityMap).map((member: any) => ({
    ...member,
    available_hours: days * 8,
    utilization_percentage: ((member.assigned_hours / (days * 8)) * 100).toFixed(2),
  }));

  res.json({
    sprint,
    sprint_days: days,
    team_capacity: capacityData,
    total_available_hours: days * 8 * capacityData.length,
    total_assigned_hours: capacityData.reduce((sum: number, m: any) => sum + parseFloat(m.assigned_hours || 0), 0),
  });
}));

export default router;
