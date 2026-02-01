import express from 'express';
import mongoose from 'mongoose';
import { SalesForecast } from '../../../models/SalesForecast.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const Lead = mongoose.model('Lead');
const router = express.Router();

// GET / - list forecasts
router.get('/', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.forecast_type) filter.forecast_type = req.query.forecast_type;
  if (req.query.user_id) filter.user_id = req.query.user_id;
  if (req.query.period_type) filter.period_type = req.query.period_type;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const total = await SalesForecast.countDocuments(filter);
  const forecasts = await SalesForecast.find(filter)
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('user_id', 'name email')
    .lean();
  res.json({ data: forecasts, total, page, limit });
}));

// POST / - create forecast
router.post('/', asyncHandler(async (req, res) => {
  const forecast = await SalesForecast.create(req.body);
  res.status(201).json(forecast);
}));

// GET /pipeline-analysis
router.get('/pipeline-analysis', asyncHandler(async (req, res) => {
  const stages = ['new', 'qualified', 'proposition', 'negotiation', 'won', 'lost'];
  const pipeline = await Lead.aggregate([
    { $match: { type: 'opportunity' } },
    { $group: {
      _id: '$stage',
      count: { $sum: 1 },
      total_revenue: { $sum: '$expected_revenue' },
      avg_probability: { $avg: '$probability' },
      weighted_revenue: { $sum: { $multiply: ['$expected_revenue', { $divide: ['$probability', 100] }] } },
    }},
    { $sort: { _id: 1 } },
  ]);
  const stageMap: any = {};
  for (const s of stages) stageMap[s] = { count: 0, total_revenue: 0, avg_probability: 0, weighted_revenue: 0 };
  for (const p of pipeline) stageMap[p._id] = p;
  const total_pipeline = pipeline.reduce((s, p) => s + p.total_revenue, 0);
  const total_weighted = pipeline.reduce((s, p) => s + p.weighted_revenue, 0);
  res.json({ stages: stageMap, total_pipeline, total_weighted });
}));

// GET /accuracy
router.get('/accuracy', asyncHandler(async (req, res) => {
  const forecasts = await SalesForecast.find({
    actual_amount: { $exists: true, $ne: null },
    forecasted_amount: { $exists: true, $gt: 0 },
  }).sort({ period_start: -1 }).limit(20).lean();
  const results = forecasts.map((f: any) => ({
    id: f._id,
    forecast_name: f.forecast_name,
    period_start: f.period_start,
    period_end: f.period_end,
    forecasted: f.forecasted_amount,
    actual: f.actual_amount,
    variance: f.actual_amount - f.forecasted_amount,
    accuracy_pct: f.forecasted_amount > 0 ? Math.round((1 - Math.abs(f.actual_amount - f.forecasted_amount) / f.forecasted_amount) * 100) : 0,
  }));
  const avg_accuracy = results.length ? Math.round(results.reduce((s, r) => s + r.accuracy_pct, 0) / results.length) : 0;
  res.json({ results, avg_accuracy });
}));

export default router;
