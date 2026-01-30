import express from 'express';
import ProjectResource from '../../../models/ProjectResource.js';
import Timesheet from '../../../models/Timesheet.js';
import ProjectTask from '../../../models/ProjectTask.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// RESOURCE PLANNING
// ============================================

// Get project resources
router.get('/:projectId/resources', asyncHandler(async (req, res) => {
  const resources = await ProjectResource.find({ project_id: req.params.projectId })
    .populate('user_id', 'name email')
    .sort({ created_at: 1 })
    .lean();

  // Enrich with total hours logged
  const result = await Promise.all(resources.map(async (r: any) => {
    const obj: any = { ...r };
    if (obj.user_id) {
      obj.user_name = obj.user_id.name;
      obj.user_email = obj.user_id.email;
    }
    const hoursAgg = await Timesheet.aggregate([
      { $match: { project_id: r.project_id, user_id: r.user_id?._id || r.user_id } },
      { $group: { _id: null, total_hours_logged: { $sum: '$hours_worked' } } },
    ]);
    obj.total_hours_logged = hoursAgg[0]?.total_hours_logged || 0;
    return obj;
  }));

  res.json(result);
}));

// Add resource to project
router.post('/:projectId/resources', asyncHandler(async (req, res) => {
  const {
    user_id, role, skill_level, allocation_percentage,
    cost_rate, planned_start_date, planned_end_date,
  } = req.body;

  const existing = await ProjectResource.findOne({
    project_id: req.params.projectId,
    user_id,
  });

  if (existing) {
    return res.status(400).json({ error: 'Resource already assigned to project' });
  }

  const resource = await ProjectResource.create({
    project_id: req.params.projectId,
    user_id,
    role,
    skill_level: skill_level || 'mid',
    allocation_percentage: allocation_percentage || 100,
    cost_rate_per_hour: cost_rate || 0,
    start_date: planned_start_date,
    end_date: planned_end_date,
  });

  res.status(201).json(resource);
}));

// Update resource
router.put('/resources/:id', asyncHandler(async (req, res) => {
  const {
    role, skill_level, allocation_percentage, cost_rate,
    planned_start_date, planned_end_date, actual_start_date, actual_end_date,
  } = req.body;

  const fields: Record<string, any> = {
    role, skill_level, allocation_percentage,
    cost_rate_per_hour: cost_rate,
    start_date: planned_start_date,
    end_date: planned_end_date,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const resource = await ProjectResource.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  res.json(resource);
}));

// Remove resource
router.delete('/resources/:id', asyncHandler(async (req, res) => {
  const resource = await ProjectResource.findByIdAndDelete(req.params.id);

  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  res.json({ message: 'Resource removed successfully' });
}));

// ============================================
// TIMESHEETS
// ============================================

// Get timesheets
router.get('/timesheets', asyncHandler(async (req, res) => {
  const { project_id, user_id, date_from, date_to, approval_status } = req.query;
  const filter: any = {};

  if (project_id) filter.project_id = project_id;
  if (user_id) filter.user_id = user_id;
  if (approval_status) filter.approval_status = approval_status;
  if (date_from || date_to) {
    filter.date_worked = {};
    if (date_from) filter.date_worked.$gte = new Date(date_from as string);
    if (date_to) filter.date_worked.$lte = new Date(date_to as string);
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Timesheet.find(filter)
      .populate('user_id', 'name email')
      .populate('project_id', 'name code')
      .populate('task_id', 'name')
      .sort({ date_worked: -1, created_at: -1 })
      .lean(),
    pagination, filter, Timesheet
  );

  const data = paginatedResult.data.map((ts: any) => {
    const obj: any = { ...ts };
    if (obj.user_id) {
      obj.user_name = obj.user_id.name;
      obj.user_email = obj.user_id.email;
    }
    if (obj.project_id) {
      obj.project_name = obj.project_id.name;
      obj.project_code = obj.project_id.code;
    }
    if (obj.task_id) {
      obj.task_name = obj.task_id.name;
    }
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get timesheet by ID
router.get('/timesheets/:id', asyncHandler(async (req, res) => {
  const ts = await Timesheet.findById(req.params.id)
    .populate('user_id', 'name email')
    .populate('project_id', 'name code')
    .populate('task_id', 'name')
    .lean();

  if (!ts) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }

  const obj: any = { ...ts };
  if (obj.user_id) { obj.user_name = obj.user_id.name; obj.user_email = obj.user_id.email; }
  if (obj.project_id) { obj.project_name = obj.project_id.name; obj.project_code = obj.project_id.code; }
  if (obj.task_id) { obj.task_name = obj.task_id.name; }

  res.json(obj);
}));

// Create timesheet entry
router.post('/timesheets', asyncHandler(async (req, res) => {
  const {
    project_id, task_id, user_id, date_worked,
    hours_worked, description, is_billable,
  } = req.body;

  const ts = await Timesheet.create({
    project_id, task_id, user_id, date_worked, hours_worked,
    description,
    is_billable: is_billable !== undefined ? is_billable : true,
    approval_status: 'draft',
  });

  // Update task actual hours
  if (task_id) {
    await ProjectTask.findByIdAndUpdate(task_id, {
      $inc: { actual_hours: hours_worked },
    });
  }

  res.status(201).json(ts);
}));

// Update timesheet
router.put('/timesheets/:id', asyncHandler(async (req, res) => {
  const {
    task_id, date_worked, hours_worked,
    description, is_billable, approval_status,
  } = req.body;

  // Get old timesheet to calculate difference
  const oldTimesheet = await Timesheet.findById(req.params.id);

  const fields: Record<string, any> = {
    task_id, date_worked, hours_worked, description, is_billable, approval_status,
  };

  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (approval_status === 'approved' && !req.body.approved_at) {
    updateData.approved_at = new Date();
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const ts = await Timesheet.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!ts) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }

  // Update task actual hours if hours changed
  if (hours_worked !== undefined && oldTimesheet) {
    const oldHours = parseFloat(String(oldTimesheet.hours_worked)) || 0;
    const newHours = parseFloat(hours_worked);
    const diff = newHours - oldHours;

    if (diff !== 0 && oldTimesheet.task_id) {
      await ProjectTask.findByIdAndUpdate(oldTimesheet.task_id, {
        $inc: { actual_hours: diff },
      });
    }
  }

  res.json(ts);
}));

// Delete timesheet
router.delete('/timesheets/:id', asyncHandler(async (req, res) => {
  const timesheet = await Timesheet.findById(req.params.id);

  const result = await Timesheet.findByIdAndDelete(req.params.id);

  if (!result) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }

  // Update task actual hours
  if (timesheet && timesheet.task_id) {
    const hours = parseFloat(String(timesheet.hours_worked)) || 0;
    await ProjectTask.findByIdAndUpdate(timesheet.task_id, {
      $inc: { actual_hours: -hours },
    });
    // Ensure non-negative
    await ProjectTask.updateOne(
      { _id: timesheet.task_id, actual_hours: { $lt: 0 } },
      { actual_hours: 0 }
    );
  }

  res.json({ message: 'Timesheet deleted successfully' });
}));

// Submit timesheet for approval
router.post('/timesheets/:id/submit', asyncHandler(async (req, res) => {
  const ts = await Timesheet.findByIdAndUpdate(
    req.params.id,
    { approval_status: 'submitted' },
    { new: true }
  );

  if (!ts) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }

  res.json(ts);
}));

// Approve/reject timesheet
router.post('/timesheets/:id/approve', asyncHandler(async (req, res) => {
  const { status, approved_by } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const ts = await Timesheet.findByIdAndUpdate(
    req.params.id,
    { approval_status: status, approved_by, approved_at: new Date() },
    { new: true }
  );

  if (!ts) {
    return res.status(404).json({ error: 'Timesheet not found' });
  }

  res.json(ts);
}));

// Get timesheet summary for a project
router.get('/:projectId/timesheets/summary', asyncHandler(async (req, res) => {
  const { date_from, date_to } = req.query;
  const match: any = { project_id: req.params.projectId };

  if (date_from || date_to) {
    match.date_worked = {};
    if (date_from) match.date_worked.$gte = new Date(date_from as string);
    if (date_to) match.date_worked.$lte = new Date(date_to as string);
  }

  const result = await Timesheet.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$user_id',
        total_hours: { $sum: '$hours_worked' },
        billable_hours: { $sum: { $cond: ['$is_billable', '$hours_worked', 0] } },
        approved_hours: { $sum: { $cond: [{ $eq: ['$approval_status', 'approved'] }, '$hours_worked', 0] } },
        entry_count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        user_id: '$_id',
        user_name: '$user.name',
        total_hours: 1,
        billable_hours: 1,
        approved_hours: 1,
        entry_count: 1,
      },
    },
    { $sort: { total_hours: -1 } },
  ]);

  res.json(result);
}));

export default router;
