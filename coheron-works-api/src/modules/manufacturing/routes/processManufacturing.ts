import express from 'express';
import { Formula } from '../models/Formula.js';
import { BatchRecord } from '../models/BatchRecord.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// ==================== Formulas ====================

router.get('/formulas', authenticate, asyncHandler(async (req: any, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Formula.find(filter).populate('output_product_id', 'name sku').sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    Formula.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

router.post('/formulas', authenticate, asyncHandler(async (req: any, res) => {
  const count = await Formula.countDocuments({ tenant_id: req.user.tenant_id });
  const formula_number = `FRM-${String(count + 1).padStart(5, '0')}`;
  const formula = await Formula.create({ ...req.body, tenant_id: req.user.tenant_id, formula_number });
  res.status(201).json(formula);
}));

router.get('/formulas/:id', authenticate, asyncHandler(async (req: any, res) => {
  const formula = await Formula.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('output_product_id', 'name sku').populate('ingredients.product_id', 'name sku').lean();
  if (!formula) return res.status(404).json({ error: 'Formula not found' });
  res.json(formula);
}));

router.put('/formulas/:id', authenticate, asyncHandler(async (req: any, res) => {
  const formula = await Formula.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true }
  );
  if (!formula) return res.status(404).json({ error: 'Formula not found' });
  res.json(formula);
}));

router.delete('/formulas/:id', authenticate, asyncHandler(async (req: any, res) => {
  const formula = await Formula.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id, status: 'draft' });
  if (!formula) return res.status(404).json({ error: 'Formula not found or cannot be deleted' });
  res.json({ message: 'Formula deleted' });
}));

// ==================== Batch Records ====================

router.get('/batches', authenticate, asyncHandler(async (req: any, res) => {
  const { status, formula_id, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (formula_id) filter.formula_id = formula_id;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    BatchRecord.find(filter).populate('formula_id', 'name formula_number').sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    BatchRecord.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

router.post('/batches', authenticate, asyncHandler(async (req: any, res) => {
  const count = await BatchRecord.countDocuments({ tenant_id: req.user.tenant_id });
  const batch_number = `BRD-${String(count + 1).padStart(5, '0')}`;
  const batch = await BatchRecord.create({ ...req.body, tenant_id: req.user.tenant_id, batch_number, operator_id: req.user._id });
  res.status(201).json(batch);
}));

router.get('/batches/:id', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await BatchRecord.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('formula_id', 'name formula_number quality_parameters').lean();
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
}));

router.put('/batches/:id', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await BatchRecord.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true }
  );
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json(batch);
}));

router.delete('/batches/:id', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await BatchRecord.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id, status: 'planned' });
  if (!batch) return res.status(404).json({ error: 'Batch not found or cannot be deleted' });
  res.json({ message: 'Batch deleted' });
}));

// POST /batches/:id/start
router.post('/batches/:id/start', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await BatchRecord.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status !== 'planned') return res.status(400).json({ error: 'Batch must be in planned status' });
  batch.status = 'in_progress';
  batch.start_date = new Date();
  await batch.save();
  res.json(batch);
}));

// POST /batches/:id/complete
router.post('/batches/:id/complete', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await BatchRecord.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status !== 'in_progress') return res.status(400).json({ error: 'Batch must be in progress' });

  batch.status = 'completed';
  batch.end_date = new Date();
  if (req.body.actual_quantity !== undefined) batch.actual_quantity = req.body.actual_quantity;
  if (req.body.quality_results) batch.quality_results = req.body.quality_results;
  if (batch.planned_quantity > 0) batch.yield_percentage = (batch.actual_quantity / batch.planned_quantity) * 100;
  batch.reviewed_by = req.user._id;
  batch.reviewed_at = new Date();
  await batch.save();
  res.json(batch);
}));

// GET /batches/:id/quality
router.get('/batches/:id/quality', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await BatchRecord.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('formula_id', 'quality_parameters').lean();
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json({ batch_number: batch.batch_number, status: batch.status, quality_results: batch.quality_results, deviations: batch.deviations });
}));

// GET /yield-analysis
router.get('/yield-analysis', authenticate, asyncHandler(async (req: any, res) => {
  const batches = await BatchRecord.find({
    tenant_id: req.user.tenant_id,
    status: 'completed',
  }).populate('formula_id', 'name formula_number').lean();

  const byFormula: Record<string, { name: string; batches: number; avg_yield: number; total_planned: number; total_actual: number }> = {};
  for (const b of batches) {
    const fid = b.formula_id?._id?.toString() || 'unknown';
    if (!byFormula[fid]) byFormula[fid] = { name: (b.formula_id as any)?.name || 'Unknown', batches: 0, avg_yield: 0, total_planned: 0, total_actual: 0 };
    byFormula[fid].batches++;
    byFormula[fid].total_planned += b.planned_quantity;
    byFormula[fid].total_actual += b.actual_quantity;
  }
  for (const k of Object.keys(byFormula)) {
    byFormula[k].avg_yield = byFormula[k].total_planned > 0 ? Math.round((byFormula[k].total_actual / byFormula[k].total_planned) * 10000) / 100 : 0;
  }
  res.json({ total_batches: batches.length, by_formula: Object.values(byFormula) });
}));

export default router;
