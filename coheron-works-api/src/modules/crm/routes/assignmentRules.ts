import express from 'express';
import { AssignmentRule } from '../models/AssignmentRule.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET all rules
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.entity_type) filter.entity_type = req.query.entity_type;
  const rules = await AssignmentRule.find(filter).sort({ priority: 1 }).lean();
  res.json(rules);
}));

// GET single
router.get('/:id', asyncHandler(async (req, res) => {
  const rule = await AssignmentRule.findById(req.params.id).lean();
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}));

// CREATE
router.post('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const rule = await AssignmentRule.create({ ...req.body, tenant_id: tenantId, created_by: userId });
  res.status(201).json(rule);
}));

// UPDATE
router.put('/:id', asyncHandler(async (req, res) => {
  const rule = await AssignmentRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}));

// DELETE
router.delete('/:id', asyncHandler(async (req, res) => {
  await AssignmentRule.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// REORDER priorities
router.post('/reorder', asyncHandler(async (req, res) => {
  const { order } = req.body; // array of { id, priority }
  const ops = (order || []).map((item: any) =>
    AssignmentRule.findByIdAndUpdate(item.id, { priority: item.priority })
  );
  await Promise.all(ops);
  res.json({ success: true });
}));

// SIMULATE - test which rule matches a lead
router.post('/simulate', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const leadData = req.body.lead || {};
  const rules = await AssignmentRule.find({ tenant_id: tenantId, is_active: true }).sort({ priority: 1 }).lean();
  let matched: any = null;
  for (const rule of rules) {
    let allMatch = true;
    for (const cond of rule.conditions || []) {
      const val = leadData[cond.field];
      switch (cond.operator) {
        case 'equals': if (val !== cond.value) allMatch = false; break;
        case 'not_equals': if (val === cond.value) allMatch = false; break;
        case 'contains': if (!String(val || '').includes(String(cond.value))) allMatch = false; break;
        case 'gt': if (Number(val) <= Number(cond.value)) allMatch = false; break;
        case 'lt': if (Number(val) >= Number(cond.value)) allMatch = false; break;
        case 'in': if (!Array.isArray(cond.value) || !cond.value.includes(val)) allMatch = false; break;
        case 'not_in': if (Array.isArray(cond.value) && cond.value.includes(val)) allMatch = false; break;
      }
      if (!allMatch) break;
    }
    if (allMatch) { matched = rule; break; }
  }
  res.json({ matched, lead: leadData });
}));

// GET stats
router.get('/stats', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const rules = await AssignmentRule.find({ tenant_id: tenantId }).sort({ priority: 1 }).lean();
  const stats = rules.map((r: any) => ({ id: r._id, name: r.name, assigned_count: r.assigned_count || 0, is_active: r.is_active }));
  res.json(stats);
}));

// TOGGLE active
router.post('/:id/toggle', asyncHandler(async (req, res) => {
  const rule = await AssignmentRule.findById(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  rule.is_active = !rule.is_active;
  await rule.save();
  res.json(rule);
}));

export default router;
