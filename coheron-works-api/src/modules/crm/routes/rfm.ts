import express from 'express';
import { CustomerRFM, RFMAnalysisRun } from '../../../models/RFMAnalysis.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { runRFMAnalysis, getSegmentDefinitions } from '../../../services/rfmService.js';

const router = express.Router();

// Run new RFM analysis
router.post('/analyze', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const run = await runRFMAnalysis(tenantId || 'default', req.body, userId || 'system');
  res.json(run);
}));

// Get analysis runs
router.get('/runs', authenticate, asyncHandler(async (req, res) => {
  const runs = await RFMAnalysisRun.find()
    .sort({ created_at: -1 })
    .limit(20)
    .lean();
  res.json(runs);
}));

// Get customer RFM data
router.get('/customers', authenticate, asyncHandler(async (req, res) => {
  const { segment, min_score, max_score, sort } = req.query;
  const filter: any = {};
  if (segment) filter.segment = segment;
  if (min_score) filter.rfm_total = { $gte: parseInt(min_score as string) };
  if (max_score) filter.rfm_total = { ...filter.rfm_total, $lte: parseInt(max_score as string) };

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    CustomerRFM.find(filter).sort(sort as string || '-rfm_total').lean(),
    pagination, filter, CustomerRFM
  );
  res.json(result);
}));

// Get single customer RFM
router.get('/customers/:customerId', authenticate, asyncHandler(async (req, res) => {
  const customer = await CustomerRFM.findOne({ customer_id: req.params.customerId }).lean();
  if (!customer) return res.status(404).json({ error: 'Customer RFM not found' });
  res.json(customer);
}));

// Get segment summary
router.get('/segments', authenticate, asyncHandler(async (req, res) => {
  const segments = await CustomerRFM.aggregate([
    { $group: {
      _id: '$segment',
      count: { $sum: 1 },
      total_revenue: { $sum: '$monetary_total' },
      avg_rfm: { $avg: '$rfm_total' },
      avg_recency: { $avg: '$recency_days' },
      avg_frequency: { $avg: '$frequency_count' },
      avg_monetary: { $avg: '$monetary_total' },
    }},
    { $sort: { avg_rfm: -1 } },
  ]);
  const definitions = getSegmentDefinitions();
  const result = segments.map(s => ({
    ...s, segment: s._id,
    definition: definitions.find(d => d.name === s._id),
  }));
  res.json(result);
}));

// Get segment definitions
router.get('/segment-definitions', authenticate, (_req, res) => {
  res.json(getSegmentDefinitions());
});

// Get churn risk report
router.get('/churn-risk', authenticate, asyncHandler(async (req, res) => {
  const atRisk = await CustomerRFM.find({
    'predictions.churn_risk': { $in: ['high', 'medium'] },
  }).sort({ 'predictions.churn_probability': -1 }).limit(100).lean();

  const summary = await CustomerRFM.aggregate([
    { $group: { _id: '$predictions.churn_risk', count: { $sum: 1 }, revenue_at_risk: { $sum: '$monetary_total' } } },
  ]);

  res.json({ at_risk_customers: atRisk, summary });
}));

export default router;
