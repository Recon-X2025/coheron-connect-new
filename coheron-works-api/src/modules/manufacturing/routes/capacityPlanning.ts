import express from 'express';
import WorkCenter from '../../../models/Workcenter.js';
import CapacityPlan from '../../../models/CapacityPlan.js';
import ManufacturingOrder from '../../../models/ManufacturingOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// List work centers
router.get('/work-centers', authenticate, asyncHandler(async (req, res) => {
  const { active, department } = req.query;
  const filter: any = {};
  if (active !== undefined) filter.active = active === 'true';
  if (department) filter.department = department;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    WorkCenter.find(filter).sort({ name: 1 }).lean(),
    pagination, filter, WorkCenter
  );
  res.json({ data: result.data, pagination: result.pagination });
}));

// Create work center
router.post('/work-centers', authenticate, asyncHandler(async (req, res) => {
  const wc = await WorkCenter.create(req.body);
  res.status(201).json({ data: wc });
}));

// Update work center
router.put('/work-centers/:id', authenticate, asyncHandler(async (req, res) => {
  const wc = await WorkCenter.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!wc) return res.status(404).json({ error: 'Work center not found' });
  res.json({ data: wc });
}));

// Get capacity load view
router.get('/load', authenticate, asyncHandler(async (req, res) => {
  const { start, end, work_center_id } = req.query;
  const filter: any = {};
  if (work_center_id) filter.work_center_id = work_center_id;
  if (start) filter.period_start = { $gte: new Date(start as string) };
  if (end) filter.period_end = { $lte: new Date(end as string) };
  const plans = await CapacityPlan.find(filter).populate('work_center_id', 'name code').sort({ period_start: 1 }).lean();
  res.json({ data: plans });
}));

// Generate capacity plan
router.post('/plans', authenticate, asyncHandler(async (req, res) => {
  const { work_center_id, period_start, period_end } = req.body;
  const wc = await WorkCenter.findById(work_center_id).lean();
  if (!wc) return res.status(404).json({ error: 'Work center not found' });
  const start = new Date(period_start);
  const endD = new Date(period_end);
  const days = Math.ceil((endD.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const workingDays = Math.floor(days * (5 / 7));
  const available_hours = workingDays * (wc.time_stop||8) * (wc.time_efficiency / 100);
  const mos = await ManufacturingOrder.find({
    state: { $in: ['confirmed', 'in_progress', 'planned'] },
    date_planned_start: { $lte: endD },
    date_planned_finished: { $gte: start },
  }).lean();
  const moList = mos.map((mo: any) => ({
    mo_id: mo._id,
    product_id: mo.product_id,
    hours_required: mo.product_qty / wc.capacity,
    priority: mo.priority || 'medium',
  }));
  const planned_hours = moList.reduce((sum: number, m: any) => sum + m.hours_required, 0);
  const utilization_pct = available_hours > 0 ? Math.round((planned_hours / available_hours) * 100) : 0;
  const plan = await CapacityPlan.create({
    ...req.body,
    available_hours,
    planned_hours,
    utilization_pct,
    manufacturing_orders: moList,
    overload: planned_hours > available_hours,
  });
  res.status(201).json({ data: plan });
}));

// List capacity plans
router.get('/plans', authenticate, asyncHandler(async (req, res) => {
  const pagination = getPaginationParams(req);
  const filter: any = {};
  const result = await paginateQuery(
    CapacityPlan.find(filter).populate('work_center_id', 'name code').sort({ period_start: -1 }).lean(),
    pagination, filter, CapacityPlan
  );
  res.json({ data: result.data, pagination: result.pagination });
}));

// Identify bottlenecks
router.get('/bottlenecks', authenticate, asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const filter: any = { overload: true };
  if (start) filter.period_start = { $gte: new Date(start as string) };
  if (end) filter.period_end = { $lte: new Date(end as string) };
  const bottlenecks = await CapacityPlan.find(filter).populate('work_center_id', 'name code').sort({ utilization_pct: -1 }).lean();
  res.json({ data: bottlenecks });
}));

export default router;
