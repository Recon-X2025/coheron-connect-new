import express from 'express';
import { DemandForecast } from '../models/DemandForecast.js';
import { DemandPlanningRun } from '../models/DemandPlanningRun.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /forecasts
router.get('/forecasts', authenticate, asyncHandler(async (req: any, res) => {
  const { product_id, warehouse_id, method, planning_run_id, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (product_id) filter.product_id = product_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (method) filter.method = method;
  if (planning_run_id) filter.planning_run_id = planning_run_id;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    DemandForecast.find(filter)
      .populate('product_id', 'name sku')
      .sort({ period_start: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    DemandForecast.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

// POST /forecasts
router.post('/forecasts', authenticate, asyncHandler(async (req: any, res) => {
  const forecast = await DemandForecast.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
  });
  res.status(201).json(forecast);
}));

// GET /runs
router.get('/runs', authenticate, asyncHandler(async (req: any, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    DemandPlanningRun.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    DemandPlanningRun.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

// POST /runs - trigger a planning run
router.post('/runs', authenticate, asyncHandler(async (req: any, res) => {
  const run = await DemandPlanningRun.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
    created_by: req.user._id,
    status: 'running',
    started_at: new Date(),
  });

  // Simulate async run completion
  setTimeout(async () => {
    try {
      await DemandPlanningRun.findByIdAndUpdate(run._id, {
        status: 'completed',
        completed_at: new Date(),
      });
    } catch (_e) { /* ignore */ }
  }, 2000);

  res.status(201).json(run);
}));

// GET /accuracy
router.get('/accuracy', authenticate, asyncHandler(async (req: any, res) => {
  const forecasts = await DemandForecast.find({
    tenant_id: req.user.tenant_id,
    actual_quantity: { $gt: 0 },
  }).lean();

  let totalError = 0;
  let count = 0;
  for (const f of forecasts) {
    if (f.forecast_quantity > 0) {
      totalError += Math.abs(f.actual_quantity - f.forecast_quantity) / f.forecast_quantity;
      count++;
    }
  }

  const mape = count > 0 ? (totalError / count) * 100 : 0;
  res.json({ total_forecasts: forecasts.length, forecasts_with_actuals: count, mape: Math.round(mape * 100) / 100, accuracy: Math.round((100 - mape) * 100) / 100 });
}));

// GET /products/:productId/forecast
router.get('/products/:productId/forecast', authenticate, asyncHandler(async (req: any, res) => {
  const forecasts = await DemandForecast.find({
    tenant_id: req.user.tenant_id,
    product_id: req.params.productId,
  }).sort({ period_start: 1 }).lean();
  res.json(forecasts);
}));

export default router;
