import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { MarketingWorkflow } from '../models/MarketingWorkflow.js';

const router = express.Router();

// List workflows
router.get('/', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { is_active, trigger_type, search, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id };
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (trigger_type) filter.trigger_type = trigger_type;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const workflows = await MarketingWorkflow.find(filter).sort({ updated_at: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).lean();
  const total = await MarketingWorkflow.countDocuments(filter);
  res.json({ workflows, total, page: Number(page), limit: Number(limit) });
}));

// Stats
router.get('/stats', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const total = await MarketingWorkflow.countDocuments({ tenant_id });
  const active = await MarketingWorkflow.countDocuments({ tenant_id, is_active: true });
  const totalExecutions = await MarketingWorkflow.aggregate([
    { $match: { tenant_id } },
    { $group: { _id: null, total: { $sum: '$execution_count' } } },
  ]);
  const byTrigger = await MarketingWorkflow.aggregate([
    { $match: { tenant_id } },
    { $group: { _id: '$trigger_type', count: { $sum: 1 }, executions: { $sum: '$execution_count' } } },
  ]);
  res.json({ total, active, total_executions: totalExecutions[0]?.total || 0, by_trigger: byTrigger });
}));

// Get workflow
router.get('/:id', asyncHandler(async (req, res) => {
  const wf = await MarketingWorkflow.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const wf = await MarketingWorkflow.create({ ...req.body, tenant_id: req.user?.tenant_id, created_by: req.user?.userId });
  res.status(201).json(wf);
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const wf = await MarketingWorkflow.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, req.body, { new: true }).lean();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Delete
router.delete('/:id', asyncHandler(async (req, res) => {
  await MarketingWorkflow.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// Activate
router.post('/:id/activate', asyncHandler(async (req, res) => {
  const wf = await MarketingWorkflow.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { is_active: true }, { new: true }).lean();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Deactivate
router.post('/:id/deactivate', asyncHandler(async (req, res) => {
  const wf = await MarketingWorkflow.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { is_active: false }, { new: true }).lean();
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Test workflow
router.post('/:id/test', asyncHandler(async (req, res) => {
  const wf = await MarketingWorkflow.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  // Simulate execution
  const results = wf.actions.map(a => ({ order: a.order, type: a.type, status: 'simulated', message: `Action "${a.type}" would execute with config` }));
  res.json({ test_results: results, trigger: wf.trigger_type });
}));

export default router;
