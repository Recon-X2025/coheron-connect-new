import express from 'express';
import { CycleCount } from '../../../models/CycleCount.js';
import { CycleCountSchedule } from '../../../models/CycleCountSchedule.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// List cycle counts
router.get('/', asyncHandler(async (req, res) => {
  const { status, warehouse_id, count_type } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (status) filter.status = status;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (count_type) filter.count_type = count_type;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(CycleCount.find(filter).sort({ scheduled_date: -1 }).lean(), pagination, filter, CycleCount);
  res.json(result);
}));

// Create cycle count
router.post('/', asyncHandler(async (req, res) => {
  const data = { ...req.body, tenant_id: (req as any).tenantId, created_by: (req as any).userId };
  const count = await CycleCount.create(data);
  res.status(201).json(count);
}));

// Get detail
router.get('/:id', asyncHandler(async (req, res) => {
  const count = await CycleCount.findById(req.params.id).lean();
  if (!count) return res.status(404).json({ error: 'Cycle count not found' });
  res.json(count);
}));

// Start counting
router.post('/:id/start', asyncHandler(async (req, res) => {
  const count = await CycleCount.findByIdAndUpdate(req.params.id, {
    status: 'in_progress', started_at: new Date()
  }, { new: true });
  if (!count) return res.status(404).json({ error: 'Cycle count not found' });
  res.json(count);
}));

// Record counted quantity for an item
router.post('/:id/record', asyncHandler(async (req, res) => {
  const { item_index, counted_quantity, serial_numbers_found, notes } = req.body;
  const count = await CycleCount.findById(req.params.id);
  if (!count) return res.status(404).json({ error: 'Cycle count not found' });
  if (count.status !== 'in_progress') return res.status(400).json({ error: 'Count not in progress' });
  const item = count.items[item_index];
  if (!item) return res.status(404).json({ error: 'Item not found' });
  item.counted_quantity = counted_quantity;
  item.variance = counted_quantity - item.system_quantity;
  item.variance_pct = item.system_quantity ? (item.variance / item.system_quantity) * 100 : 0;
  if (serial_numbers_found) item.serial_numbers_found = serial_numbers_found;
  if (notes) item.notes = notes;
  item.counted_by = (req as any).userId;
  item.counted_at = new Date();
  count.items_counted = count.items.filter((i: any) => i.counted_quantity != null).length;
  await count.save();
  res.json(count);
}));

// Complete count
router.post('/:id/complete', asyncHandler(async (req, res) => {
  const count = await CycleCount.findById(req.params.id);
  if (!count) return res.status(404).json({ error: 'Cycle count not found' });
  count.status = 'completed';
  count.completed_at = new Date();
  count.items_with_variance = count.items.filter((i: any) => i.variance && i.variance !== 0).length;
  count.variance_value = count.items.reduce((s: number, i: any) => s + Math.abs(i.variance || 0), 0);
  await count.save();
  res.json(count);
}));

// Create inventory adjustment
router.post('/:id/adjust', asyncHandler(async (req, res) => {
  const count = await CycleCount.findById(req.params.id);
  if (!count) return res.status(404).json({ error: 'Cycle count not found' });
  if (count.status !== 'completed') return res.status(400).json({ error: 'Count not completed' });
  if (req.body.adjustment_journal_id) count.adjustment_journal_id = req.body.adjustment_journal_id;
  await count.save();
  res.json(count);
}));

// List schedules
router.get('/schedules', asyncHandler(async (req, res) => {
  const filter: any = { tenant_id: (req as any).tenantId };
  if (req.query.warehouse_id) filter.warehouse_id = req.query.warehouse_id;
  if (req.query.is_active) filter.is_active = req.query.is_active === 'true';
  const schedules = await CycleCountSchedule.find(filter).sort({ next_scheduled_date: 1 }).lean();
  res.json(schedules);
}));

// Create schedule
router.post('/schedules', asyncHandler(async (req, res) => {
  const data = { ...req.body, tenant_id: (req as any).tenantId };
  const schedule = await CycleCountSchedule.create(data);
  res.status(201).json(schedule);
}));

// Update schedule
router.put('/schedules/:id', asyncHandler(async (req, res) => {
  const schedule = await CycleCountSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  res.json(schedule);
}));

// Generate counts from active schedules
router.post('/schedules/generate', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const now = new Date();
  const schedules = await CycleCountSchedule.find({
    tenant_id: tenantId, is_active: true, next_scheduled_date: { $lte: now }
  });
  const created: any[] = [];
  for (const sched of schedules) {
    const count = await CycleCount.create({
      tenant_id: tenantId, count_number: 'CC-' + Date.now(),
      warehouse_id: sched.warehouse_id, count_type: sched.count_type,
      abc_class: sched.abc_class, zone_id: sched.zone_id,
      scheduled_date: now, status: 'planned',
      items: [], total_items: 0, items_counted: 0,
      items_with_variance: 0, variance_value: 0,
      created_by: (req as any).userId,
    });
    created.push(count);
    sched.last_count_date = now;
    const freq: any = { daily: 1, weekly: 7, monthly: 30, quarterly: 90 };
    const days = freq[sched.frequency] || 30;
    sched.next_scheduled_date = new Date(now.getTime() + days * 86400000);
    await sched.save();
  }
  res.status(201).json({ generated: created.length, counts: created });
}));

export default router;
