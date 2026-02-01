import express from 'express';
import { ProjectAutomationRule } from '../models/ProjectAutomationRule.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET / - list rules
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.project_id) filter.project_id = req.query.project_id;
  if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
  const rules = await ProjectAutomationRule.find(filter)
    .sort({ created_at: -1 })
    .populate('created_by', 'name email')
    .lean();
  res.json(rules);
}));

// GET /:id
router.get('/:id', asyncHandler(async (req, res) => {
  const rule = await ProjectAutomationRule.findById(req.params.id).lean();
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}));

// POST /
router.post('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const rule = await ProjectAutomationRule.create({ ...req.body, tenant_id: tenantId, created_by: userId });
  res.status(201).json(rule);
}));

// PUT /:id
router.put('/:id', asyncHandler(async (req, res) => {
  const rule = await ProjectAutomationRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}));

// DELETE /:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await ProjectAutomationRule.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// POST /:id/test - test rule (dry run)
router.post('/:id/test', asyncHandler(async (req, res) => {
  const rule = await ProjectAutomationRule.findById(req.params.id).lean();
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({
    rule_id: rule._id,
    name: rule.name,
    trigger_type: rule.trigger_type,
    action_type: rule.action_type,
    test_result: 'success',
    message: `Rule "${rule.name}" would trigger on ${rule.trigger_type} and execute ${rule.action_type}`,
  });
}));

// POST /:id/toggle - enable/disable
router.post('/:id/toggle', asyncHandler(async (req, res) => {
  const rule = await ProjectAutomationRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  rule.is_active = !rule.is_active;
  await rule.save();
  res.json(rule);
}));

export default router;
