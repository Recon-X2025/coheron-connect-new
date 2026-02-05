import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { AssetMaintenanceSchedule } from '../models/AssetMaintenanceSchedule.js';

const router = express.Router();

// List all maintenance schedules
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { status, maintenance_type, asset_id, page = '1', limit = '20' } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  if (maintenance_type) filter.maintenance_type = maintenance_type;
  if (asset_id) filter.asset_id = asset_id;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    AssetMaintenanceSchedule.find(filter).sort({ next_maintenance_date: 1 }).skip(skip).limit(Number(limit)).lean(),
    AssetMaintenanceSchedule.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
}));

// Upcoming maintenance (next 30 days by default)
router.get('/upcoming', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const days = Number(req.query.days) || 30;
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const filter: any = {
    status: 'active',
    next_maintenance_date: { $gte: now, $lte: future },
  };
  if (tenant_id) filter.tenant_id = tenant_id;
  const items = await AssetMaintenanceSchedule.find(filter).sort({ next_maintenance_date: 1 }).lean();
  res.json(items);
}));

// Overdue maintenance
router.get('/overdue', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = { status: 'active', next_maintenance_date: { $lt: new Date() } };
  if (tenant_id) filter.tenant_id = tenant_id;
  const items = await AssetMaintenanceSchedule.find(filter).sort({ next_maintenance_date: 1 }).lean();
  res.json(items);
}));

// Get single
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await AssetMaintenanceSchedule.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json(item);
}));

// Create
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await AssetMaintenanceSchedule.create({ ...req.body, tenant_id });
  res.status(201).json(item);
}));

// Update
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { tenant_id, ...update } = req.body;
  const item = await AssetMaintenanceSchedule.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json(item);
}));

// Delete
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await AssetMaintenanceSchedule.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ message: 'Deleted' });
}));

// Record maintenance (log a completed maintenance)
router.post('/:id/record', authenticate, asyncHandler(async (req, res) => {
  const { cost, performed_by, notes } = req.body;
  const schedule = await AssetMaintenanceSchedule.findById(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

  const entry = { date: new Date(), cost: cost || 0, performed_by: performed_by || '', notes: notes || '' };
  schedule.maintenance_history.push(entry as any);
  schedule.last_maintenance_date = new Date();

  // Calculate next maintenance date based on frequency
  const now = new Date();
  const freqMap: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 };
  const months = freqMap[schedule.frequency] || 3;
  const next = new Date(now);
  next.setMonth(next.getMonth() + months);
  schedule.next_maintenance_date = next;

  await schedule.save();
  res.json(schedule);
}));

// Cost summary
router.get('/stats/cost-summary', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const match: any = {};
  if (tenant_id) match.tenant_id = tenant_id;
  const result = await AssetMaintenanceSchedule.aggregate([
    { $match: match },
    { $unwind: { path: '$maintenance_history', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: '$asset_id',
      asset_name: { $first: '$asset_name' },
      total_cost: { $sum: { $ifNull: ['$maintenance_history.cost', 0] } },
      maintenance_count: { $sum: { $cond: [{ $ifNull: ['$maintenance_history.date', false] }, 1, 0] } },
      estimated_annual_cost: { $first: '$estimated_cost' },
    }},
    { $sort: { total_cost: -1 } },
  ]);
  res.json(result);
}));

export default router;
