import express from 'express';
import { InspectionPlan } from '../models/InspectionPlan.js';
import { SPCMeasurement } from '../models/SPCMeasurement.js';
import { NonConformanceReport } from '../models/NonConformanceReport.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ─── Inspection Plans ───

router.get('/plans', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { status, inspection_type, product_id, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (inspection_type) filter.inspection_type = inspection_type;
  if (product_id) filter.product_id = product_id;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [data, total] = await Promise.all([
    InspectionPlan.find(filter).populate('product_id', 'name sku').sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).lean(),
    InspectionPlan.countDocuments(filter),
  ]);
  res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

router.get('/plans/:id', asyncHandler(async (req, res) => {
  const doc = await InspectionPlan.findById(req.params.id).populate('product_id', 'name sku').lean();
  if (!doc) return res.status(404).json({ error: 'Inspection plan not found' });
  res.json(doc);
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const doc = await InspectionPlan.create({ ...req.body, tenant_id, created_by: req.user?.userId });
  res.status(201).json(doc);
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  const doc = await InspectionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

router.delete('/plans/:id', asyncHandler(async (req, res) => {
  await InspectionPlan.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

router.post('/plans/:id/approve', asyncHandler(async (req, res) => {
  const doc = await InspectionPlan.findByIdAndUpdate(
    req.params.id,
    { status: 'approved', approved_by: req.user?.userId },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

// ─── SPC Measurements ───

router.post('/measurements', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plan = await InspectionPlan.findById(req.body.inspection_plan_id).lean();
  if (!plan) return res.status(404).json({ error: 'Inspection plan not found' });

  const cp = plan.checkpoints[req.body.checkpoint_index];
  if (!cp) return res.status(400).json({ error: 'Invalid checkpoint index' });

  const in_spec =
    req.body.measured_value >= (cp.tolerance_lower ?? -Infinity) &&
    req.body.measured_value <= (cp.tolerance_upper ?? Infinity);

  const doc = await SPCMeasurement.create({
    ...req.body,
    tenant_id,
    measured_by: req.user?.userId,
    measured_at: new Date(),
    in_spec,
  });
  res.status(201).json(doc);
}));

router.get('/measurements/:planId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { checkpoint_index, page = '1', limit = '100' } = req.query;
  const filter: any = { tenant_id, inspection_plan_id: req.params.planId };
  if (checkpoint_index !== undefined) filter.checkpoint_index = parseInt(checkpoint_index as string);

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const data = await SPCMeasurement.find(filter).sort({ measured_at: 1 }).skip(skip).limit(parseInt(limit as string)).lean();
  res.json({ data });
}));

router.get('/spc-chart/:planId/:checkpointIndex', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const measurements = await SPCMeasurement.find({
    tenant_id,
    inspection_plan_id: req.params.planId,
    checkpoint_index: parseInt(req.params.checkpointIndex),
  })
    .sort({ measured_at: 1 })
    .lean();

  if (measurements.length === 0) return res.json({ measurements: [], ucl: 0, lcl: 0, mean: 0 });

  const values = measurements.map((m) => m.measured_value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
  const ucl = mean + 3 * stdDev;
  const lcl = mean - 3 * stdDev;

  // Update control chart data on latest measurements
  const bulkOps = measurements.map((m) => ({
    updateOne: {
      filter: { _id: m._id },
      update: { control_chart_data: { ucl, lcl, mean, range: ucl - lcl } },
    },
  }));
  if (bulkOps.length > 0) await SPCMeasurement.bulkWrite(bulkOps);

  res.json({ measurements, ucl, lcl, mean, stdDev, count: values.length });
}));

// ─── Non-Conformance Reports ───

router.get('/ncr', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { status, severity, category, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (category) filter.category = category;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [data, total] = await Promise.all([
    NonConformanceReport.find(filter).populate('product_id', 'name sku').sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).lean(),
    NonConformanceReport.countDocuments(filter),
  ]);
  res.json({ data, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

router.get('/ncr/:id', asyncHandler(async (req, res) => {
  const doc = await NonConformanceReport.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'NCR not found' });
  res.json(doc);
}));

router.post('/ncr', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const count = await NonConformanceReport.countDocuments({ tenant_id });
  const ncr_number = `NCR-${String(count + 1).padStart(6, '0')}`;
  const doc = await NonConformanceReport.create({ ...req.body, tenant_id, ncr_number, reported_by: req.user?.userId });
  res.status(201).json(doc);
}));

router.put('/ncr/:id', asyncHandler(async (req, res) => {
  const doc = await NonConformanceReport.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

router.delete('/ncr/:id', asyncHandler(async (req, res) => {
  await NonConformanceReport.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

router.post('/ncr/:id/investigate', asyncHandler(async (req, res) => {
  const doc = await NonConformanceReport.findByIdAndUpdate(
    req.params.id,
    { status: 'investigating', root_cause: req.body.root_cause, root_cause_method: req.body.root_cause_method },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

router.post('/ncr/:id/close', asyncHandler(async (req, res) => {
  const doc = await NonConformanceReport.findByIdAndUpdate(
    req.params.id,
    { status: 'closed', closed_at: new Date(), disposition: req.body.disposition },
    { new: true }
  ).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

// ─── Quality Dashboard ───

router.get('/quality-dashboard', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;

  const [totalMeasurements, inSpecCount, ncrBySeverity, ncrByCategory] = await Promise.all([
    SPCMeasurement.countDocuments({ tenant_id }),
    SPCMeasurement.countDocuments({ tenant_id, in_spec: true }),
    NonConformanceReport.aggregate([
      { $match: { tenant_id } },
      { $group: { _id: '$severity', count: { $sum: 1 } } },
    ]),
    NonConformanceReport.aggregate([
      { $match: { tenant_id } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const yieldRate = totalMeasurements > 0 ? (inSpecCount / totalMeasurements) * 100 : 100;
  const totalNCR = ncrBySeverity.reduce((s: number, r: any) => s + r.count, 0);

  res.json({
    yield_rate: Math.round(yieldRate * 100) / 100,
    total_measurements: totalMeasurements,
    in_spec_count: inSpecCount,
    total_ncr: totalNCR,
    ncr_by_severity: ncrBySeverity,
    ncr_by_category: ncrByCategory,
  });
}));

// ─── Cost of Quality ───

router.get('/cost-of-quality', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;

  const ncrs = await NonConformanceReport.find({ tenant_id }).lean();
  let internalFailure = 0;
  let externalFailure = 0;
  for (const ncr of ncrs) {
    if (ncr.disposition === 'scrap' || ncr.disposition === 'rework') {
      internalFailure += ncr.cost_impact || 0;
    } else if (ncr.disposition === 'return_to_supplier') {
      externalFailure += ncr.cost_impact || 0;
    }
  }

  // Prevention & appraisal are estimations based on inspection plan count and measurement count
  const planCount = await InspectionPlan.countDocuments({ tenant_id, status: 'approved' });
  const measurementCount = await SPCMeasurement.countDocuments({ tenant_id });

  const prevention = planCount * 50; // estimated cost per plan maintenance
  const appraisal = measurementCount * 2; // estimated cost per measurement

  res.json({
    prevention,
    appraisal,
    internal_failure: internalFailure,
    external_failure: externalFailure,
    total: prevention + appraisal + internalFailure + externalFailure,
  });
}));

export default router;
