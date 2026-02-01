import express from 'express';
import { Objective } from '../models/Objective.js';
import { KeyResult } from '../models/KeyResult.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ===== OBJECTIVES =====

router.get('/objectives', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.year) filter.year = parseInt(req.query.year as string);
  if (req.query.period) filter.period = req.query.period;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.owner_id) filter.owner_id = req.query.owner_id;
  const objectives = await Objective.find(filter)
    .sort({ year: -1, period: 1 })
    .populate('owner_id', 'name email')
    .populate('parent_objective_id', 'title')
    .lean();
  res.json(objectives);
}));

router.get('/objectives/:id', asyncHandler(async (req, res) => {
  const obj = await Objective.findById(req.params.id)
    .populate('owner_id', 'name email')
    .populate('parent_objective_id', 'title')
    .lean();
  if (!obj) return res.status(404).json({ error: 'Objective not found' });
  const keyResults = await KeyResult.find({ objective_id: req.params.id }).populate('owner_id', 'name email').lean();
  const children = await Objective.find({ parent_objective_id: req.params.id }).lean();
  res.json({ ...obj, key_results: keyResults, children });
}));

router.post('/objectives', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const obj = await Objective.create({ ...req.body, tenant_id: tenantId });
  res.status(201).json(obj);
}));

router.put('/objectives/:id', asyncHandler(async (req, res) => {
  const obj = await Objective.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!obj) return res.status(404).json({ error: 'Objective not found' });
  res.json(obj);
}));

router.delete('/objectives/:id', asyncHandler(async (req, res) => {
  await Objective.findByIdAndDelete(req.params.id);
  await KeyResult.deleteMany({ objective_id: req.params.id });
  res.json({ success: true });
}));

// GET /objectives/:id/progress - computed from key results
router.get('/objectives/:id/progress', asyncHandler(async (req, res) => {
  const keyResults = await KeyResult.find({ objective_id: req.params.id }).lean();
  if (!keyResults.length) return res.json({ progress: 0, key_results: [] });
  const totalWeight = keyResults.reduce((s, kr) => s + (kr.weight || 1), 0);
  const weightedProgress = keyResults.reduce((s, kr) => {
    const pct = kr.target_value > 0 ? Math.min((kr.current_value / kr.target_value) * 100, 100) : 0;
    return s + pct * (kr.weight || 1);
  }, 0);
  const progress = Math.round(weightedProgress / totalWeight);
  await Objective.findByIdAndUpdate(req.params.id, { progress });
  res.json({ progress, key_results: keyResults });
}));

// ===== KEY RESULTS =====

router.get('/key-results', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.objective_id) filter.objective_id = req.query.objective_id;
  const krs = await KeyResult.find(filter).populate('owner_id', 'name email').lean();
  res.json(krs);
}));

router.post('/key-results', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const kr = await KeyResult.create({ ...req.body, tenant_id: tenantId });
  res.status(201).json(kr);
}));

router.put('/key-results/:id', asyncHandler(async (req, res) => {
  const kr = await KeyResult.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!kr) return res.status(404).json({ error: 'Key result not found' });
  res.json(kr);
}));

router.delete('/key-results/:id', asyncHandler(async (req, res) => {
  await KeyResult.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// PUT /key-results/:id/update-progress
router.put('/key-results/:id/update-progress', asyncHandler(async (req, res) => {
  const { current_value, status } = req.body;
  const update: any = {};
  if (current_value !== undefined) update.current_value = current_value;
  if (status) update.status = status;
  const kr = await KeyResult.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!kr) return res.status(404).json({ error: 'Key result not found' });
  res.json(kr);
}));

export default router;
