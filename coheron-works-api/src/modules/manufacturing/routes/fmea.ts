import express from 'express';
import { FMEA } from '../models/FMEA.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// List FMEAs
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { status, process_or_design, product_id, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (process_or_design) filter.process_or_design = process_or_design;
  if (product_id) filter.product_id = product_id;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [data, total] = await Promise.all([
    FMEA.find(filter).populate('product_id', 'name sku').sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).lean(),
    FMEA.countDocuments(filter),
  ]);
  res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// Get single FMEA
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const doc = await FMEA.findById(req.params.id).populate('product_id', 'name sku').lean();
  if (!doc) return res.status(404).json({ error: 'FMEA not found' });
  res.json(doc);
}));

// Create FMEA
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  // Compute RPN for each item
  const items = (req.body.items || []).map((item: any) => ({
    ...item,
    rpn: (item.severity || 1) * (item.occurrence || 1) * (item.detection || 1),
  }));
  const doc = await FMEA.create({ ...req.body, items, tenant_id, created_by: req.user?.userId });
  res.status(201).json(doc);
}));

// Update FMEA
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  if (req.body.items) {
    req.body.items = req.body.items.map((item: any) => ({
      ...item,
      rpn: (item.severity || 1) * (item.occurrence || 1) * (item.detection || 1),
      new_rpn: item.new_severity && item.new_occurrence && item.new_detection
        ? item.new_severity * item.new_occurrence * item.new_detection
        : item.new_rpn || 0,
    }));
  }
  const doc = await FMEA.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

// Delete FMEA
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await FMEA.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// Add item to FMEA
router.post('/:id/add-item', authenticate, asyncHandler(async (req, res) => {
  const item = {
    ...req.body,
    rpn: (req.body.severity || 1) * (req.body.occurrence || 1) * (req.body.detection || 1),
  };
  const doc = await FMEA.findByIdAndUpdate(
    req.params.id,
    { $push: { items: item } },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

// Update specific item
router.put('/:id/items/:itemIndex', authenticate, asyncHandler(async (req, res) => {
  const idx = parseInt(req.params.itemIndex);
  const updates: any = {};
  for (const [key, val] of Object.entries(req.body)) {
    updates[`items.${idx}.${key}`] = val;
  }
  // Recompute RPN
  const existing = await FMEA.findById(req.params.id).lean();
  if (!existing || !existing.items[idx]) return res.status(404).json({ error: 'Item not found' });

  const merged = { ...existing.items[idx] as any, ...req.body };
  updates[`items.${idx}.rpn`] = (merged.severity || 1) * (merged.occurrence || 1) * (merged.detection || 1);
  if (merged.new_severity && merged.new_occurrence && merged.new_detection) {
    updates[`items.${idx}.new_rpn`] = merged.new_severity * merged.new_occurrence * merged.new_detection;
  }

  const doc = await FMEA.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).lean();
  res.json(doc);
}));

// RPN Analysis
router.get('/:id/rpn-analysis', authenticate, asyncHandler(async (req, res) => {
  const doc = await FMEA.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const sorted = [...doc.items].sort((a, b) => (b.rpn || 0) - (a.rpn || 0));
  const totalRPN = sorted.reduce((s, i) => s + (i.rpn || 0), 0);
  let cumulative = 0;
  const pareto = sorted.map((item, idx) => {
    cumulative += item.rpn || 0;
    return {
      index: idx,
      failure_mode: item.potential_failure_mode,
      rpn: item.rpn,
      cumulative_pct: totalRPN > 0 ? Math.round((cumulative / totalRPN) * 10000) / 100 : 0,
    };
  });

  res.json({ items: sorted, pareto, total_rpn: totalRPN });
}));

// Review FMEA
router.post('/:id/review', authenticate, asyncHandler(async (req, res) => {
  const doc = await FMEA.findByIdAndUpdate(
    req.params.id,
    { status: 'active', reviewed_by: req.user?.userId, reviewed_at: new Date() },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

export default router;
