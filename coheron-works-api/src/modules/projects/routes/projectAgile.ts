import express from 'express';
import Sprint from '../../../models/Sprint.js';
import BacklogItem from '../../../models/BacklogItem.js';
import SprintBurndown from '../../../models/SprintBurndown.js';
import Release from '../../../models/Release.js';
import ReleaseItem from '../../../models/ReleaseItem.js';
import AutomationRule from '../../../models/AutomationRule.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// SPRINTS
// ============================================

// Get all sprints for a project
router.get('/projects/:projectId/sprints', asyncHandler(async (req, res) => {
  const { state } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (state) filter.state = state;

  const sprints = await Sprint.find(filter).sort({ start_date: -1 });

  const result = await Promise.all(sprints.map(async (s) => {
    const agg = await BacklogItem.aggregate([
      { $match: { sprint_id: s._id } },
      {
        $group: {
          _id: null,
          backlog_item_count: { $sum: 1 },
          total_story_points: { $sum: '$story_points' },
          completed_items: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          completed_story_points: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, '$story_points', 0] } },
        },
      },
    ]);
    const obj: any = s.toObject();
    Object.assign(obj, agg[0] || { backlog_item_count: 0, total_story_points: 0, completed_items: 0, completed_story_points: 0 });
    return obj;
  }));

  res.json(result);
}));

// Get sprint by ID
router.get('/sprints/:id', asyncHandler(async (req, res) => {
  const sprint = await Sprint.findById(req.params.id)
    .populate('project_id', 'name code');

  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  const obj: any = sprint.toObject();
  if (obj.project_id) {
    obj.project_name = obj.project_id.name;
    obj.project_code = obj.project_id.code;
  }

  // Get backlog items
  const items = await BacklogItem.find({ sprint_id: sprint._id })
    .populate('assignee_id', 'name')
    .sort({ priority: -1, created_at: 1 });

  const itemRows = items.map(i => {
    const iObj: any = i.toObject();
    if (iObj.assignee_id) iObj.assignee_name = iObj.assignee_id.name;
    return iObj;
  });

  // Get burndown data
  const burndown = await SprintBurndown.find({ sprint_id: sprint._id }).sort({ date: 1 }).lean();

  res.json({
    ...obj,
    backlog_items: itemRows,
    burndown,
  });
}));

// Create sprint
router.post('/projects/:projectId/sprints', asyncHandler(async (req, res) => {
  const { name, goal, start_date, end_date, state } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'Name, start date, and end date are required' });
  }

  if (new Date(start_date) >= new Date(end_date)) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  const sprint = await Sprint.create({
    project_id: req.params.projectId,
    name, goal, start_date, end_date,
    state: state || 'future',
  });

  res.status(201).json(sprint);
}));

// Update sprint
router.put('/sprints/:id', asyncHandler(async (req, res) => {
  const { name, goal, start_date, end_date, state, velocity } = req.body;

  if (start_date && end_date && new Date(start_date) >= new Date(end_date)) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  const fields: Record<string, any> = { name, goal, start_date, end_date, state, velocity };
  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const sprint = await Sprint.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  res.json(sprint);
}));

// Delete sprint
router.delete('/sprints/:id', asyncHandler(async (req, res) => {
  const sprint = await Sprint.findByIdAndDelete(req.params.id);

  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  res.json({ message: 'Sprint deleted successfully' });
}));

// Start sprint
router.post('/sprints/:id/start', asyncHandler(async (req, res) => {
  const sprint = await Sprint.findByIdAndUpdate(
    req.params.id,
    { state: 'active' },
    { new: true }
  );

  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  res.json(sprint);
}));

// Close sprint
router.post('/sprints/:id/close', asyncHandler(async (req, res) => {
  const velocityAgg = await BacklogItem.aggregate([
    { $match: { sprint_id: req.params.id, status: 'done' } },
    { $group: { _id: null, velocity: { $sum: '$story_points' } } },
  ]);

  const velocity = velocityAgg[0]?.velocity || 0;

  const sprint = await Sprint.findByIdAndUpdate(
    req.params.id,
    { state: 'closed', velocity },
    { new: true }
  );

  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found' });
  }

  res.json(sprint);
}));

// ============================================
// BACKLOG ITEMS (Epics, Stories, Bugs)
// ============================================

// Get backlog items
router.get('/projects/:projectId/backlog', asyncHandler(async (req, res) => {
  const { item_type, status, sprint_id, epic_id } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (item_type) filter.item_type = item_type;
  if (status) filter.status = status;
  if (sprint_id) {
    if (sprint_id === 'null') {
      filter.sprint_id = null;
    } else {
      filter.sprint_id = sprint_id;
    }
  }
  if (epic_id) filter.epic_id = epic_id;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    BacklogItem.find(filter)
      .populate('assignee_id', 'name')
      .populate('epic_id', 'title')
      .sort({ priority: -1, created_at: 1 })
      .lean(),
    pagination, filter, BacklogItem
  );

  const data = paginatedResult.data.map((i: any) => {
    const obj: any = { ...i };
    if (obj.assignee_id) obj.assignee_name = obj.assignee_id.name;
    if (obj.epic_id) obj.epic_title = obj.epic_id.title;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get backlog item by ID
router.get('/backlog/:id', asyncHandler(async (req, res) => {
  const item = await BacklogItem.findById(req.params.id)
    .populate('assignee_id', 'name')
    .populate('epic_id', 'title')
    .populate('sprint_id', 'name');

  if (!item) {
    return res.status(404).json({ error: 'Backlog item not found' });
  }

  const obj: any = item.toObject();
  if (obj.assignee_id) obj.assignee_name = obj.assignee_id.name;
  if (obj.epic_id) obj.epic_title = obj.epic_id.title;
  if (obj.sprint_id) obj.sprint_name = obj.sprint_id.name;

  // Get stories if this is an epic
  if (item.item_type === 'epic') {
    const stories = await BacklogItem.find({ epic_id: item._id }).sort({ priority: -1, created_at: 1 }).lean();
    obj.stories = stories;
  }

  res.json(obj);
}));

// Create backlog item
router.post('/projects/:projectId/backlog', asyncHandler(async (req, res) => {
  const {
    sprint_id, epic_id, item_type, title, description,
    acceptance_criteria, story_points, priority, status, assignee_id,
  } = req.body;

  if (!item_type || !title) {
    return res.status(400).json({ error: 'Item type and title are required' });
  }

  const item = await BacklogItem.create({
    project_id: req.params.projectId,
    sprint_id, epic_id, item_type, title, description,
    acceptance_criteria, story_points,
    priority: priority || 0,
    status: status || 'backlog',
    assignee_id,
  });

  res.status(201).json(item);
}));

// Update backlog item
router.put('/backlog/:id', asyncHandler(async (req, res) => {
  const {
    sprint_id, epic_id, item_type, title, description,
    acceptance_criteria, story_points, priority, status, assignee_id,
  } = req.body;

  const fields: Record<string, any> = {
    sprint_id, epic_id, item_type, title, description,
    acceptance_criteria, story_points, priority, status, assignee_id,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const item = await BacklogItem.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!item) {
    return res.status(404).json({ error: 'Backlog item not found' });
  }

  res.json(item);
}));

// Delete backlog item
router.delete('/backlog/:id', asyncHandler(async (req, res) => {
  const item = await BacklogItem.findByIdAndDelete(req.params.id);

  if (!item) {
    return res.status(404).json({ error: 'Backlog item not found' });
  }

  res.json({ message: 'Backlog item deleted successfully' });
}));

// ============================================
// SPRINT BURNDOWN
// ============================================

// Get burndown data
router.get('/sprints/:id/burndown', asyncHandler(async (req, res) => {
  const data = await SprintBurndown.find({ sprint_id: req.params.id }).sort({ date: 1 }).lean();
  res.json(data);
}));

// Update burndown data (usually automated)
router.post('/sprints/:id/burndown', asyncHandler(async (req, res) => {
  const { date, remaining_story_points, completed_story_points } = req.body;
  const burndownDate = date || new Date().toISOString().split('T')[0];

  const entry = await SprintBurndown.findOneAndUpdate(
    { sprint_id: req.params.id, date: burndownDate },
    {
      sprint_id: req.params.id,
      date: burndownDate,
      remaining_story_points,
      completed_story_points: completed_story_points || 0,
    },
    { upsert: true, new: true }
  );

  res.status(201).json(entry);
}));

// ============================================
// RELEASES
// ============================================

// Get project releases
router.get('/projects/:projectId/releases', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = { project_id: req.params.projectId };
  if (status) filter.status = status;

  const releases = await Release.find(filter).sort({ release_date: -1 });

  const result = await Promise.all(releases.map(async (r) => {
    const itemCount = await ReleaseItem.countDocuments({ release_id: r._id });
    const obj: any = r.toObject();
    obj.item_count = itemCount;
    return obj;
  }));

  res.json(result);
}));

// Get release by ID
router.get('/releases/:id', asyncHandler(async (req, res) => {
  const release = await Release.findById(req.params.id)
    .populate('project_id', 'name code');

  if (!release) {
    return res.status(404).json({ error: 'Release not found' });
  }

  const obj: any = release.toObject();
  if (obj.project_id) {
    obj.project_name = obj.project_id.name;
    obj.project_code = obj.project_id.code;
  }

  // Get release items
  const releaseItems = await ReleaseItem.find({ release_id: release._id })
    .populate('backlog_item_id');

  const items = releaseItems.map(ri => ri.backlog_item_id).filter(Boolean);

  res.json({
    ...obj,
    items,
  });
}));

// Create release
router.post('/projects/:projectId/releases', asyncHandler(async (req, res) => {
  const { name, version, release_date, status, release_notes } = req.body;

  if (!name || !version) {
    return res.status(400).json({ error: 'Name and version are required' });
  }

  const release = await Release.create({
    project_id: req.params.projectId,
    name, version, release_date,
    status: status || 'planned',
    release_notes,
  });

  res.status(201).json(release);
}));

// Update release
router.put('/releases/:id', asyncHandler(async (req, res) => {
  const { name, version, release_date, status, release_notes } = req.body;

  const fields: Record<string, any> = { name, version, release_date, status, release_notes };
  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const release = await Release.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!release) {
    return res.status(404).json({ error: 'Release not found' });
  }

  res.json(release);
}));

// Add item to release
router.post('/releases/:id/items', asyncHandler(async (req, res) => {
  const { backlog_item_id } = req.body;

  const existing = await ReleaseItem.findOne({ release_id: req.params.id, backlog_item_id });
  if (existing) {
    return res.status(400).json({ error: 'Item already in release or not found' });
  }

  const item = await ReleaseItem.create({
    release_id: req.params.id,
    backlog_item_id,
  });

  res.status(201).json(item);
}));

// Remove item from release
router.delete('/releases/:id/items/:itemId', asyncHandler(async (req, res) => {
  const result = await ReleaseItem.findOneAndDelete({
    release_id: req.params.id,
    backlog_item_id: req.params.itemId,
  });

  if (!result) {
    return res.status(404).json({ error: 'Item not found in release' });
  }

  res.json({ message: 'Item removed from release successfully' });
}));

// ============================================
// AUTOMATION RULES
// ============================================

// Get automation rules
router.get('/projects/:projectId/automation-rules', asyncHandler(async (req, res) => {
  const rules = await AutomationRule.find({ project_id: req.params.projectId })
    .sort({ created_at: -1 })
    .lean();
  res.json(rules);
}));

// Create automation rule
router.post('/projects/:projectId/automation-rules', asyncHandler(async (req, res) => {
  const { rule_name, trigger_condition, action_type, action_params, is_active } = req.body;

  if (!rule_name || !trigger_condition || !action_type) {
    return res.status(400).json({ error: 'Rule name, trigger condition, and action type are required' });
  }

  const rule = await AutomationRule.create({
    project_id: req.params.projectId,
    rule_name, trigger_condition, action_type, action_params,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json(rule);
}));

// Update automation rule
router.put('/automation-rules/:id', asyncHandler(async (req, res) => {
  const { rule_name, trigger_condition, action_type, action_params, is_active } = req.body;

  const fields: Record<string, any> = { rule_name, trigger_condition, action_type, action_params, is_active };
  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const rule = await AutomationRule.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!rule) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }

  res.json(rule);
}));

// Delete automation rule
router.delete('/automation-rules/:id', asyncHandler(async (req, res) => {
  const rule = await AutomationRule.findByIdAndDelete(req.params.id);

  if (!rule) {
    return res.status(404).json({ error: 'Automation rule not found' });
  }

  res.json({ message: 'Automation rule deleted successfully' });
}));

export default router;
