import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { RevenueContract } from '../models/RevenueContract.js';
import { RevenueSchedule } from '../models/RevenueSchedule.js';

const router = express.Router();

// List contracts
router.get('/contracts', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (req.query.status) filter.status = req.query.status;
  const { page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    RevenueContract.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    RevenueContract.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
}));

// Waterfall report
router.get('/waterfall', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  const schedules = await RevenueSchedule.find(filter).sort({ period: 1 }).lean();
  const waterfall: Record<string, { period: string; recognized: number; pending: number }> = {};
  for (const s of schedules) {
    const p = (s as any).period;
    if (!waterfall[p]) waterfall[p] = { period: p, recognized: 0, pending: 0 };
    if ((s as any).status === 'recognized') {
      waterfall[p].recognized += (s as any).amount;
    } else {
      waterfall[p].pending += (s as any).amount;
    }
  }
  res.json({ periods: Object.values(waterfall) });
}));

// Unbilled revenue
router.get('/unbilled-revenue', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = { status: 'recognized' };
  if (tenant_id) filter.tenant_id = tenant_id;
  const recognized = await RevenueSchedule.find(filter).lean();
  const total = recognized.reduce((sum, s) => sum + ((s as any).amount || 0), 0);
  res.json({ total_unbilled: total, items: recognized });
}));

// Get single contract
router.get('/contracts/:id', asyncHandler(async (req, res) => {
  const item = await RevenueContract.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Contract not found' });
  res.json(item);
}));

// Get contract schedule
router.get('/contracts/:id/schedule', asyncHandler(async (req, res) => {
  const schedules = await RevenueSchedule.find({ contract_id: req.params.id }).sort({ period: 1 }).lean();
  res.json({ items: schedules });
}));

// Create contract
router.post('/contracts', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await RevenueContract.create({ ...req.body, tenant_id });
  res.status(201).json(item);
}));

// Update contract
router.put('/contracts/:id', asyncHandler(async (req, res) => {
  const item = await RevenueContract.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ error: 'Contract not found' });
  res.json(item);
}));

// Delete contract
router.delete('/contracts/:id', asyncHandler(async (req, res) => {
  const item = await RevenueContract.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Contract not found' });
  await RevenueSchedule.deleteMany({ contract_id: req.params.id });
  res.json({ success: true });
}));

// Recognize revenue for period
router.post('/contracts/:id/recognize', asyncHandler(async (req, res) => {
  const { period, obligation_index } = req.body;
  const tenant_id = (req as any).user?.tenant_id;
  const contract = await RevenueContract.findById(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });

  const schedules = await RevenueSchedule.find({
    contract_id: req.params.id,
    period,
    status: 'pending',
    ...(obligation_index !== undefined ? { obligation_index } : {}),
  });

  for (const schedule of schedules) {
    schedule.status = 'recognized';
    schedule.recognized = true;
    schedule.recognition_date = new Date();
    await schedule.save();
  }

  res.json({ recognized: schedules.length });
}));

export default router;
