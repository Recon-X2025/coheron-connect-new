import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { ConsolidationGroup } from '../models/ConsolidationGroup.js';
import { ConsolidationRun } from '../models/ConsolidationRun.js';

const router = express.Router();

// --- Groups ---
router.get('/groups', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
  const items = await ConsolidationGroup.find(filter).sort({ name: 1 }).lean();
  res.json({ items });
}));

router.get('/groups/:id', asyncHandler(async (req, res) => {
  const item = await ConsolidationGroup.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Group not found' });
  res.json(item);
}));

router.post('/groups', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await ConsolidationGroup.create({ ...req.body, tenant_id });
  res.status(201).json(item);
}));

router.put('/groups/:id', asyncHandler(async (req, res) => {
  const item = await ConsolidationGroup.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ error: 'Group not found' });
  res.json(item);
}));

router.delete('/groups/:id', asyncHandler(async (req, res) => {
  const item = await ConsolidationGroup.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Group not found' });
  res.json({ success: true });
}));

// --- Runs ---
router.get('/runs', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (req.query.group_id) filter.group_id = req.query.group_id;
  if (req.query.status) filter.status = req.query.status;
  const items = await ConsolidationRun.find(filter).sort({ created_at: -1 }).populate('group_id', 'name').lean();
  res.json({ items });
}));

router.get('/runs/:id', asyncHandler(async (req, res) => {
  const item = await ConsolidationRun.findById(req.params.id).populate('group_id').lean();
  if (!item) return res.status(404).json({ error: 'Run not found' });
  res.json(item);
}));

router.post('/runs', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const created_by = (req as any).user?._id;
  const item = await ConsolidationRun.create({ ...req.body, tenant_id, created_by });
  res.status(201).json(item);
}));

router.put('/runs/:id', asyncHandler(async (req, res) => {
  const item = await ConsolidationRun.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ error: 'Run not found' });
  res.json(item);
}));

router.delete('/runs/:id', asyncHandler(async (req, res) => {
  const item = await ConsolidationRun.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Run not found' });
  res.json({ success: true });
}));

// Execute consolidation run
router.post('/runs/:id/execute', asyncHandler(async (req, res) => {
  const run = await ConsolidationRun.findById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (run.status !== 'draft') return res.status(400).json({ error: 'Run must be in draft status' });
  run.status = 'in_progress';
  await run.save();
  // Simulate consolidation: set totals and mark completed
  run.consolidated_totals = {
    total_assets: 0,
    total_liabilities: 0,
    total_equity: 0,
    total_revenue: 0,
    total_expenses: 0,
  };
  run.status = 'completed';
  run.completed_at = new Date();
  await run.save();
  res.json(run);
}));

// Consolidation report
router.get('/runs/:id/report', asyncHandler(async (req, res) => {
  const run = await ConsolidationRun.findById(req.params.id).populate('group_id').lean();
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.json({
    run,
    consolidated_totals: (run as any).consolidated_totals,
    eliminations: (run as any).eliminations,
  });
}));

// Intercompany balances
router.get('/intercompany-balances', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  // Placeholder - would aggregate intercompany transactions
  res.json({ balances: [] });
}));

export default router;
