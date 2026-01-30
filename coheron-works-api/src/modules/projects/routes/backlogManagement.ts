import express from 'express';
import Backlog from '../../../models/Backlog.js';
import Issue from '../../../models/Issue.js';
import SprintIssue from '../../../models/SprintIssue.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// ENHANCED BACKLOG MANAGEMENT
// ============================================

// Get Backlog with Enhanced Filtering and Grouping
router.get('/projects/:projectId/backlog/enhanced', asyncHandler(async (req, res) => {
  const { epic_id, issue_type, status, assignee_id, priority, search, sort_by = 'priority' } = req.query;

  // Get backlog items for project
  const backlogItems = await Backlog.find({ project_id: req.params.projectId })
    .populate({
      path: 'issue_id',
      populate: [
        { path: 'issue_type_id', select: 'name' },
        { path: 'epic_id', select: 'name' },
        { path: 'assignee_id', select: 'name' },
        { path: 'reporter_id', select: 'name' },
      ],
    });

  // Filter in memory (since we need to filter on populated fields)
  let items = backlogItems
    .filter((b: any) => b.issue_id) // filter out null refs
    .map((b: any) => ({
      ...b.toObject(),
      ...b.issue_id.toObject(),
      backlog_priority: b.priority,
      backlog_rank: b.rank,
      issue_type_name: b.issue_id.issue_type_id?.name,
      epic_name: b.issue_id.epic_id?.name,
      epic_id: b.issue_id.epic_id?._id || b.issue_id.epic_id,
      assignee_name: b.issue_id.assignee_id?.name,
      reporter_name: b.issue_id.reporter_id?.name,
    }));

  if (epic_id && epic_id !== 'null') {
    items = items.filter((i: any) => i.epic_id?.toString() === epic_id);
  } else if (epic_id === 'null') {
    items = items.filter((i: any) => !i.epic_id);
  }

  if (issue_type) {
    items = items.filter((i: any) => i.issue_type_name === issue_type);
  }

  if (status) {
    items = items.filter((i: any) => i.status === status);
  }

  if (assignee_id && assignee_id !== 'null') {
    items = items.filter((i: any) => i.assignee_id?.toString() === assignee_id);
  } else if (assignee_id === 'null') {
    items = items.filter((i: any) => !i.assignee_id);
  }

  if (priority) {
    items = items.filter((i: any) => i.priority === priority);
  }

  if (search) {
    const re = new RegExp(search as string, 'i');
    items = items.filter((i: any) => re.test(i.summary) || re.test(i.description || ''));
  }

  // Sorting
  switch (sort_by) {
    case 'priority':
      items.sort((a: any, b: any) => (b.backlog_priority || 0) - (a.backlog_priority || 0) || (a.backlog_rank || Infinity) - (b.backlog_rank || Infinity));
      break;
    case 'rank':
      items.sort((a: any, b: any) => (a.backlog_rank || Infinity) - (b.backlog_rank || Infinity));
      break;
    case 'created':
      items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'story_points':
      items.sort((a: any, b: any) => (b.story_points || 0) - (a.story_points || 0));
      break;
    default:
      items.sort((a: any, b: any) => (b.backlog_priority || 0) - (a.backlog_priority || 0));
  }

  // Group by epic
  const grouped = items.reduce((acc: any, item: any) => {
    const epicKey = item.epic_id ? `epic-${item.epic_id}` : 'no-epic';
    if (!acc[epicKey]) {
      acc[epicKey] = {
        epic_id: item.epic_id || null,
        epic_name: item.epic_name || 'No Epic',
        items: [],
      };
    }
    acc[epicKey].items.push(item);
    return acc;
  }, {});

  res.json({
    items,
    grouped_by_epic: Object.values(grouped),
    total_count: items.length,
    total_story_points: items.reduce((sum: number, item: any) => sum + (item.story_points || 0), 0),
  });
}));

// Update Backlog Priority/Rank (for drag-and-drop)
router.put('/projects/:projectId/backlog/reorder', asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items must be an array' });
  }

  const bulkOps = items.map((item: any) => ({
    updateOne: {
      filter: { project_id: req.params.projectId, issue_id: item.issue_id },
      update: { $set: { priority: item.priority, rank: item.rank } },
    },
  }));

  await Backlog.bulkWrite(bulkOps);
  res.json({ message: 'Backlog reordered successfully' });
}));

// Bulk Add Issues to Backlog
router.post('/projects/:projectId/backlog/bulk-add', asyncHandler(async (req, res) => {
  const { issue_ids } = req.body;

  if (!Array.isArray(issue_ids) || issue_ids.length === 0) {
    return res.status(400).json({ error: 'issue_ids must be a non-empty array' });
  }

  const results = [];
  for (const issueId of issue_ids) {
    const issue = await Issue.findById(issueId);
    if (!issue) continue;
    if (issue.project_id.toString() !== req.params.projectId) continue;

    // Remove from sprint if in one
    await SprintIssue.deleteMany({ issue_id: issueId });

    // Add to backlog (upsert)
    const existing = await Backlog.findOne({ project_id: req.params.projectId, issue_id: issueId });
    if (!existing) {
      const backlogItem = await Backlog.create({
        project_id: req.params.projectId,
        issue_id: issueId,
        priority: 0,
        rank: null,
      });
      results.push(backlogItem);
    }
  }

  res.json({ message: `Added ${results.length} issues to backlog`, items: results });
}));

// Backlog Grooming - Get Unestimated Items
router.get('/projects/:projectId/backlog/grooming', asyncHandler(async (req, res) => {
  const backlogItems = await Backlog.find({ project_id: req.params.projectId })
    .populate({
      path: 'issue_id',
      match: {
        $or: [
          { story_points: null },
          { story_points: 0 },
        ],
        $and: [
          { $or: [{ time_estimate: null }, { time_estimate: 0 }] },
        ],
      },
      populate: [
        { path: 'issue_type_id', select: 'name' },
        { path: 'epic_id', select: 'name' },
      ],
    })
    .sort({ priority: -1 });

  const items = backlogItems
    .filter((b: any) => b.issue_id)
    .map((b: any) => ({
      ...b.toObject(),
      ...b.issue_id.toObject(),
      issue_type_name: b.issue_id.issue_type_id?.name,
      epic_name: b.issue_id.epic_id?.name,
    }));

  res.json({
    unestimated_items: items,
    count: items.length,
  });
}));

// Quick Filters for Backlog
router.get('/projects/:projectId/backlog/filters', asyncHandler(async (req, res) => {
  const projectId = req.params.projectId;

  const backlogItems = await Backlog.find({ project_id: projectId }).populate({
    path: 'issue_id',
    populate: [
      { path: 'issue_type_id', select: 'name' },
      { path: 'epic_id', select: 'name' },
      { path: 'assignee_id', select: 'name' },
    ],
  });

  const epics: any = {};
  const types: any = {};
  const assignees: any = {};
  const statuses: any = {};

  for (const b of backlogItems) {
    const issue = (b as any).issue_id;
    if (!issue) continue;

    const epicId = issue.epic_id?._id?.toString() || 'null';
    const epicName = issue.epic_id?.name || null;
    if (!epics[epicId]) epics[epicId] = { id: issue.epic_id?._id || null, name: epicName, count: 0 };
    epics[epicId].count++;

    const typeId = issue.issue_type_id?._id?.toString() || 'null';
    const typeName = issue.issue_type_id?.name || null;
    if (!types[typeId]) types[typeId] = { id: issue.issue_type_id?._id || null, name: typeName, count: 0 };
    types[typeId].count++;

    if (issue.assignee_id) {
      const aId = issue.assignee_id._id.toString();
      if (!assignees[aId]) assignees[aId] = { id: issue.assignee_id._id, name: issue.assignee_id.name, count: 0 };
      assignees[aId].count++;
    }

    const st = issue.status || 'unknown';
    if (!statuses[st]) statuses[st] = { status: st, count: 0 };
    statuses[st].count++;
  }

  res.json({
    epics: Object.values(epics),
    issue_types: Object.values(types),
    assignees: Object.values(assignees),
    statuses: Object.values(statuses),
  });
}));

export default router;
