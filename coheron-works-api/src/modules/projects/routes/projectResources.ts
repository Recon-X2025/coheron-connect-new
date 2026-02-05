import express from 'express';
import ProjectResource from '../../../models/ProjectResource.js';
import Timesheet from '../../../models/Timesheet.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();
router.use(authenticate);

// ============================================
// RESOURCE PLANNING & CAPACITY MANAGEMENT
// ============================================

// Get project resources with capacity analysis
router.get('/:projectId/resources', asyncHandler(async (req, res) => {
  const resources = await ProjectResource.find({ project_id: req.params.projectId })
    .populate('user_id', 'name email')
    .sort({ created_at: 1 })
    .lean();

  const result = await Promise.all(resources.map(async (r: any) => {
    const obj: any = { ...r };
    if (obj.user_id) {
      obj.user_name = obj.user_id.name;
      obj.user_email = obj.user_id.email;
    }
    const hoursAgg = await Timesheet.aggregate([
      { $match: { project_id: r.project_id, user_id: r.user_id, approval_status: 'approved' } },
      { $group: { _id: null, total_hours_logged: { $sum: '$hours_worked' } } },
    ]);
    obj.total_hours_logged = hoursAgg[0]?.total_hours_logged || 0;
    obj.remaining_hours = (obj.planned_hours || 0) - obj.total_hours_logged;
    return obj;
  }));

  res.json(result);
}));

// Get resource capacity across all projects
router.get('/resources/:userId/capacity', asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  const filter: any = { user_id: req.params.userId };

  if (date_from && date_to) {
    filter.start_date = { $lte: new Date(date_to as string) };
    filter.end_date = { $gte: new Date(date_from as string) };
  }

  const resources = await ProjectResource.find(filter)
    .populate('project_id', 'name code')
    .lean();

  const result = await Promise.all(resources.map(async (pr: any) => {
    const obj: any = { ...pr };
    if (obj.project_id) {
      obj.project_name = obj.project_id.name;
      obj.project_code = obj.project_id.code;
    }
    const hoursAgg = await Timesheet.aggregate([
      { $match: { project_id: pr.project_id, user_id: pr.user_id } },
      { $group: { _id: null, logged_hours: { $sum: '$hours_worked' } } },
    ]);
    obj.logged_hours = hoursAgg[0]?.logged_hours || 0;
    return obj;
  }));

  const totalAllocation = result.reduce((sum, row) => sum + (row.allocation_percentage || 0), 0);

  res.json({
    resources: result,
    total_allocation: totalAllocation,
    available_capacity: Math.max(0, 100 - totalAllocation),
  });
}));

// Add resource to project
router.post('/:projectId/resources', asyncHandler(async (req, res) => {
  const {
    user_id, role, skill_level, allocation_percentage,
    cost_rate_per_hour, planned_hours, start_date, end_date, shift_type,
  } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const existing = await ProjectResource.findOne({ project_id: req.params.projectId, user_id });
  if (existing) {
    return res.status(400).json({ error: 'Resource already assigned to project' });
  }

  const resource = await ProjectResource.create({
    project_id: req.params.projectId,
    user_id, role,
    skill_level: skill_level || 'mid',
    allocation_percentage: allocation_percentage || 100,
    cost_rate_per_hour: cost_rate_per_hour || 0,
    planned_hours: planned_hours || 0,
    start_date, end_date,
    shift_type: shift_type || 'day',
  });

  res.status(201).json(resource);
}));

// Update resource
router.put('/resources/:id', asyncHandler(async (req, res) => {
  const {
    role, skill_level, allocation_percentage, cost_rate_per_hour,
    planned_hours, actual_hours, start_date, end_date, shift_type,
  } = req.body;

  const fields: Record<string, any> = {
    role, skill_level, allocation_percentage, cost_rate_per_hour,
    planned_hours, actual_hours, start_date, end_date, shift_type,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const resource = await ProjectResource.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  res.json(resource);
}));

// Remove resource
router.delete('/resources/:id', asyncHandler(async (req, res) => {
  const resource = await ProjectResource.findByIdAndDelete(req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });
  res.json({ message: 'Resource removed successfully' });
}));

// Get skills matrix for project
router.get('/:projectId/skills-matrix', asyncHandler(async (req, res) => {
  const skillLevelOrder: Record<string, number> = { expert: 1, senior: 2, mid: 3, junior: 4 };

  const result = await ProjectResource.aggregate([
    { $match: { project_id: req.params.projectId } },
    {
      $group: {
        _id: { role: '$role', skill_level: '$skill_level' },
        resource_count: { $addToSet: '$user_id' },
        total_planned_hours: { $sum: '$planned_hours' },
        total_actual_hours: { $sum: '$actual_hours' },
      },
    },
    {
      $project: {
        role: '$_id.role',
        skill_level: '$_id.skill_level',
        resource_count: { $size: '$resource_count' },
        total_planned_hours: 1,
        total_actual_hours: 1,
        _id: 0,
      },
    },
    { $sort: { role: 1, skill_level: 1 } },
  ]);

  // Sort by skill level order
  result.sort((a, b) => {
    if (a.role !== b.role) return (a.role || '').localeCompare(b.role || '');
    return (skillLevelOrder[a.skill_level] || 5) - (skillLevelOrder[b.skill_level] || 5);
  });

  res.json(result);
}));

export default router;
