import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { DeferralSchedule } from '../models/DeferralSchedule.js';

const router = express.Router();

// List schedules
router.get('/', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    DeferralSchedule.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    DeferralSchedule.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
}));

// Summary
router.get('/summary', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = { status: 'active' };
  if (tenant_id) filter.tenant_id = tenant_id;
  const schedules = await DeferralSchedule.find(filter).lean();
  let deferred_revenue = 0;
  let deferred_expenses = 0;
  for (const s of schedules) {
    const pending = ((s as any).periods || [])
      .filter((p: any) => p.status === 'pending')
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    if ((s as any).type === 'revenue') deferred_revenue += pending;
    else deferred_expenses += pending;
  }
  res.json({ deferred_revenue, deferred_expenses, total_schedules: schedules.length });
}));

// Get single schedule
router.get('/schedules/:id', asyncHandler(async (req, res) => {
  const item = await DeferralSchedule.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json(item);
}));

// Get schedule periods
router.get('/schedules/:id/periods', asyncHandler(async (req, res) => {
  const item = await DeferralSchedule.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ periods: (item as any).periods || [] });
}));

// Create schedule
router.post('/', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const created_by = (req as any).user?._id;
  const item = await DeferralSchedule.create({ ...req.body, tenant_id, created_by });
  res.status(201).json(item);
}));

// Update schedule
router.put('/schedules/:id', asyncHandler(async (req, res) => {
  const item = await DeferralSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json(item);
}));

// Delete schedule
router.delete('/schedules/:id', asyncHandler(async (req, res) => {
  const item = await DeferralSchedule.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ success: true });
}));

// Recognize a single period
router.post('/recognize-period', asyncHandler(async (req, res) => {
  const { schedule_id, period } = req.body;
  const schedule = await DeferralSchedule.findById(schedule_id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  const p = schedule.periods.find((pr: any) => pr.period === period && pr.status === 'pending');
  if (!p) return res.status(400).json({ error: 'Period not found or already recognized' });
  (p as any).status = 'recognized';
  (p as any).recognition_date = new Date();
  // Check if all periods recognized
  const allRecognized = schedule.periods.every((pr: any) => pr.status === 'recognized');
  if (allRecognized) schedule.status = 'completed';
  await schedule.save();
  res.json(schedule);
}));

// Auto-recognize all due periods
router.post('/auto-recognize', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const filter: any = { status: 'active' };
  if (tenant_id) filter.tenant_id = tenant_id;
  const schedules = await DeferralSchedule.find(filter);
  let totalRecognized = 0;
  for (const schedule of schedules) {
    let changed = false;
    for (const p of schedule.periods) {
      if ((p as any).status === 'pending' && (p as any).period <= currentPeriod) {
        (p as any).status = 'recognized';
        (p as any).recognition_date = now;
        totalRecognized++;
        changed = true;
      }
    }
    if (changed) {
      const allRecognized = schedule.periods.every((pr: any) => pr.status === 'recognized');
      if (allRecognized) schedule.status = 'completed';
      await schedule.save();
    }
  }
  res.json({ recognized_periods: totalRecognized });
}));

export default router;
