import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { ABTest } from '../../../models/ABTest.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// List A/B tests
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, campaign_id } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (campaign_id) filter.campaign_id = campaign_id;
  const params = getPaginationParams(req);
  const result = await paginateQuery(ABTest.find(filter).sort({ created_at: -1 }).lean(), params, filter, ABTest);
  res.json(result);
}));

// Create A/B test
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const test = new ABTest({ ...req.body, created_by: (req as any).user?.id });
  await test.save();
  res.status(201).json(test);
}));

// Get test with results
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const test = await ABTest.findById(req.params.id).lean();
  if (!test) return res.status(404).json({ message: 'A/B test not found' });
  res.json(test);
}));

// Start test
router.post('/:id/start', authenticate, asyncHandler(async (req, res) => {
  const test = await ABTest.findByIdAndUpdate(req.params.id, { status: 'running', start_date: new Date() }, { new: true });
  if (!test) return res.status(404).json({ message: 'A/B test not found' });
  res.json(test);
}));

// Complete test and determine winner
router.post('/:id/complete', authenticate, asyncHandler(async (req, res) => {
  const test = await ABTest.findById(req.params.id);
  if (!test) return res.status(404).json({ message: 'A/B test not found' });
  const t = test as any;
  const metric = t.winning_metric || 'open_rate';
  let bestVariant = '';
  let bestScore = -1;
  for (const variant of t.variants || []) {
    let score = 0;
    const sent = variant.emails_sent || 1;
    if (metric === 'open_rate') score = (variant.opens || 0) / sent;
    else if (metric === 'click_rate') score = (variant.clicks || 0) / sent;
    else if (metric === 'conversion_rate') score = (variant.conversions || 0) / sent;
    if (score > bestScore) { bestScore = score; bestVariant = variant.name; }
  }
  t.winner_variant = bestVariant;
  t.status = 'completed';
  t.end_date = new Date();
  await test.save();
  res.json(test);
}));

// Get detailed variant comparison
router.get('/:id/results', authenticate, asyncHandler(async (req, res) => {
  const test = await ABTest.findById(req.params.id).lean();
  if (!test) return res.status(404).json({ message: 'A/B test not found' });
  const t = test as any;
  const results = (t.variants || []).map((v: any) => {
    const sent = v.emails_sent || 1;
    return {
      name: v.name, emails_sent: v.emails_sent,
      opens: v.opens, clicks: v.clicks, conversions: v.conversions, revenue: v.revenue,
      open_rate: ((v.opens || 0) / sent * 100).toFixed(2),
      click_rate: ((v.clicks || 0) / sent * 100).toFixed(2),
      conversion_rate: ((v.conversions || 0) / sent * 100).toFixed(2),
      is_winner: v.name === t.winner_variant,
    };
  });
  res.json({ test_name: t.name, status: t.status, winning_metric: t.winning_metric, winner: t.winner_variant, confidence_level: t.confidence_level, variants: results });
}));

export default router;
