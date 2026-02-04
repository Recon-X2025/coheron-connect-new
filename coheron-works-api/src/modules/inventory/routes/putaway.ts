import express from 'express';
import { PutawayRule } from '../../../models/PutawayRule.js';
import { BinLocation } from '../../../models/BinLocation.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /rules
router.get('/rules', authenticate, asyncHandler(async (req: any, res) => {
  const rules = await PutawayRule.find({ tenant_id: req.user.tenant_id }).sort({ priority: 1 }).lean();
  res.json(rules);
}));

// POST /rules
router.post('/rules', authenticate, asyncHandler(async (req: any, res) => {
  const rule = await PutawayRule.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(rule);
}));

// PUT /rules/:id
router.put('/rules/:id', authenticate, asyncHandler(async (req: any, res) => {
  const rule = await PutawayRule.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body, { new: true }
  );
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}));

// DELETE /rules/:id
router.delete('/rules/:id', authenticate, asyncHandler(async (req: any, res) => {
  const rule = await PutawayRule.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json({ message: 'Rule deleted' });
}));

// POST /suggest
router.post('/suggest', authenticate, asyncHandler(async (req: any, res) => {
  const { product_id, product_category, quantity } = req.body;
  const rules = await PutawayRule.find({ tenant_id: req.user.tenant_id, is_active: true }).sort({ priority: 1 }).lean();
  const suggestions: any[] = [];

  for (const rule of rules) {
    const cond = rule.conditions as any;
    let match = true;
    if (cond.product_id && cond.product_id.toString() !== product_id) match = false;
    if (cond.product_category && cond.product_category !== product_category) match = false;
    if (!match) continue;

    const dest = rule.destination as any;
    const binFilter: any = { tenant_id: req.user.tenant_id };
    if (dest.warehouse_id) binFilter.warehouse_id = dest.warehouse_id;
    if (dest.zone_id) binFilter.zone_id = dest.zone_id;
    const bins = await BinLocation.find(binFilter).lean();
    const available = bins.filter((bin: any) => {
      if (dest.bin_pattern) {
        try { if (!new RegExp(dest.bin_pattern).test(bin.code || bin.name)) return false; } catch(e) {}
      }
      return true;
    });

    available.forEach((bin: any) => {
      suggestions.push({ rule_name: rule.name, strategy: rule.strategy, bin, priority: rule.priority });
    });
    if (suggestions.length >= 5) break;
  }

  res.json({ suggestions: suggestions.slice(0, 5) });
}));

export default router;
