import express from 'express';
import WorkOrder from '../models/WorkOrder.js';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import MoOperatorActivity from '../models/MoOperatorActivity.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// WORK ORDERS - CRUD & Shop Floor Operations
// ============================================

// Get all work orders
router.get('/', asyncHandler(async (req, res) => {
  const { mo_id, state, workcenter_id, search } = req.query;
  const filter: any = {};

  if (mo_id) filter.mo_id = mo_id;
  if (state) filter.state = state;
  if (workcenter_id) filter.workcenter_id = workcenter_id;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WorkOrder.find(filter)
      .populate('mo_id', 'name mo_number')
      .populate('workcenter_id', 'name')
      .populate('operation_id', 'name')
      .sort({ sequence: 1, date_planned_start: 1 })
      .lean(),
    pagination, filter, WorkOrder
  );

  const data = paginatedResult.data.map((wo: any) => ({
    ...wo,
    mo_name: wo.mo_id?.name,
    mo_number: wo.mo_id?.mo_number,
    workcenter_name: wo.workcenter_id?.name,
    operation_name: wo.operation_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get work order by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id)
    .populate('mo_id', 'name mo_number')
    .populate('workcenter_id', 'name')
    .populate('operation_id', 'name')
    .populate('user_id', 'name')
    .lean();

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  const activities = await MoOperatorActivity.find({ workorder_id: req.params.id })
    .populate('operator_id', 'name')
    .sort({ timestamp: -1 })
    .lean();

  const activityResult = activities.map((oa: any) => ({
    ...oa,
    operator_name: oa.operator_id?.name,
  }));

  res.json({
    ...wo,
    mo_name: (wo as any).mo_id?.name,
    mo_number: (wo as any).mo_id?.mo_number,
    workcenter_name: (wo as any).workcenter_id?.name,
    operation_name: (wo as any).operation_id?.name,
    user_name: (wo as any).user_id?.name,
    activities: activityResult,
  });
}));

// Update work order
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'state', 'date_planned_start', 'date_planned_finished', 'date_start', 'date_finished',
    'duration', 'qty_produced', 'qty_producing', 'qty_scrapped', 'user_id', 'note',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const wo = await WorkOrder.findByIdAndUpdate(id, updateData, { new: true });

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  res.json(wo);
}));

// ============================================
// SHOP FLOOR OPERATIONS
// ============================================

// Start work order
router.post('/:id/start', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { operator_id } = req.body;

  const wo = await WorkOrder.findById(id);

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  if (wo.state !== 'ready' && wo.state !== 'pending') {
    return res.status(400).json({ error: 'Work order must be ready or pending to start' });
  }

  const result = await WorkOrder.findByIdAndUpdate(
    id,
    {
      state: 'progress',
      date_start: new Date(),
      is_user_working: true,
      ...(operator_id ? { user_id: operator_id } : {}),
    },
    { new: true }
  );

  await MoOperatorActivity.create({
    workorder_id: id,
    operator_id: operator_id || wo.user_id,
    activity_type: 'start',
  });

  res.json(result);
}));

// Pause work order
router.post('/:id/pause', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { operator_id, downtime_reason, downtime_duration } = req.body;

  const wo = await WorkOrder.findById(id);

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  if (wo.state !== 'progress') {
    return res.status(400).json({ error: 'Work order must be in progress to pause' });
  }

  const result = await WorkOrder.findByIdAndUpdate(
    id,
    { is_user_working: false },
    { new: true }
  );

  await MoOperatorActivity.create({
    workorder_id: id,
    operator_id: operator_id || wo.user_id,
    activity_type: 'pause',
    downtime_reason,
    downtime_duration,
  });

  res.json(result);
}));

// Resume work order
router.post('/:id/resume', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { operator_id } = req.body;

  const wo = await WorkOrder.findById(id);

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  if (wo.state !== 'progress') {
    return res.status(400).json({ error: 'Work order must be in progress to resume' });
  }

  const result = await WorkOrder.findByIdAndUpdate(
    id,
    { is_user_working: true },
    { new: true }
  );

  await MoOperatorActivity.create({
    workorder_id: id,
    operator_id: operator_id || wo.user_id,
    activity_type: 'resume',
  });

  res.json(result);
}));

// Complete work order
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { operator_id, qty_produced, qty_scrapped } = req.body;

  const wo = await WorkOrder.findById(id);

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  if (wo.state !== 'progress') {
    return res.status(400).json({ error: 'Work order must be in progress to complete' });
  }

  const startTime = wo.date_start ? new Date(wo.date_start) : new Date();
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

  const result = await WorkOrder.findByIdAndUpdate(
    id,
    {
      state: 'done',
      date_finished: new Date(),
      is_user_working: false,
      duration,
      ...(qty_produced !== undefined ? { qty_produced } : {}),
      ...(qty_scrapped !== undefined ? { qty_scrapped } : {}),
    },
    { new: true }
  );

  await MoOperatorActivity.create({
    workorder_id: id,
    operator_id: operator_id || wo.user_id,
    activity_type: 'complete',
    qty_produced,
    qty_scrapped,
  });

  // Update MO quantities
  await ManufacturingOrder.findByIdAndUpdate(wo.mo_id, {
    $inc: {
      qty_produced: qty_produced || 0,
      qty_scrapped: qty_scrapped || 0,
    },
  });

  // Check if all work orders are done
  const remainingCount = await WorkOrder.countDocuments({
    mo_id: wo.mo_id,
    state: { $ne: 'done' },
  });

  if (remainingCount === 0) {
    const mo = await ManufacturingOrder.findById(wo.mo_id);
    if (mo && mo.state === 'progress') {
      await ManufacturingOrder.findByIdAndUpdate(wo.mo_id, { state: 'to_close' });
    }
  } else {
    // Start next work order
    const nextWO = await WorkOrder.findOne({
      mo_id: wo.mo_id,
      state: 'pending',
    }).sort({ sequence: 1 });

    if (nextWO) {
      await WorkOrder.findByIdAndUpdate(nextWO._id, { state: 'ready' });
    }
  }

  res.json(result);
}));

// Record scrap
router.post('/:id/scrap', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { operator_id, qty_scrapped, reason } = req.body;

  const wo = await WorkOrder.findById(id);

  if (!wo) {
    return res.status(404).json({ error: 'Work order not found' });
  }

  await WorkOrder.findByIdAndUpdate(id, {
    $inc: { qty_scrapped },
  });

  await MoOperatorActivity.create({
    workorder_id: id,
    operator_id: operator_id || wo.user_id,
    activity_type: 'scrap',
    qty_scrapped,
    notes: reason,
  });

  await ManufacturingOrder.findByIdAndUpdate(wo.mo_id, {
    $inc: { qty_scrapped },
  });

  res.json({ message: 'Scrap recorded successfully' });
}));

// Get shop floor dashboard data
router.get('/shop-floor/dashboard', asyncHandler(async (req, res) => {
  const { workcenter_id } = req.query;
  const matchFilter: any = {};

  if (workcenter_id) matchFilter.workcenter_id = workcenter_id;

  const pipeline: any[] = [
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        active_count: { $sum: { $cond: [{ $eq: ['$state', 'progress'] }, 1, 0] } },
        ready_count: { $sum: { $cond: [{ $eq: ['$state', 'ready'] }, 1, 0] } },
        pending_count: { $sum: { $cond: [{ $eq: ['$state', 'pending'] }, 1, 0] } },
        completed_count: { $sum: { $cond: [{ $eq: ['$state', 'done'] }, 1, 0] } },
        qty_in_progress: {
          $sum: { $cond: [{ $eq: ['$state', 'progress'] }, '$qty_produced', 0] },
        },
        total_scrapped: { $sum: '$qty_scrapped' },
      },
    },
  ];

  const statsResult = await WorkOrder.aggregate(pipeline);
  const stats = statsResult[0] || {
    active_count: 0,
    ready_count: 0,
    pending_count: 0,
    completed_count: 0,
    qty_in_progress: 0,
    total_scrapped: 0,
  };

  const activeFilter: any = { state: 'progress' };
  if (workcenter_id) activeFilter.workcenter_id = workcenter_id;

  const activeOrders = await WorkOrder.find(activeFilter)
    .populate('mo_id', 'name')
    .populate('workcenter_id', 'name')
    .sort({ date_planned_start: 1 })
    .lean();

  const active = activeOrders.map((wo: any) => ({
    ...wo,
    mo_name: wo.mo_id?.name,
    workcenter_name: wo.workcenter_id?.name,
  }));

  res.json({
    statistics: stats,
    active_work_orders: active,
  });
}));

export default router;
