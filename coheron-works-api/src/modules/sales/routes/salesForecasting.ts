import express from 'express';
import { SalesForecast, SalesTarget } from '../../../models/SalesForecast.js';
import { Lead } from '../../../models/Lead.js';
import { SaleOrder } from '../../../models/SaleOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// SALES FORECASTS
// ============================================

// Get all forecasts
router.get('/forecasts', asyncHandler(async (req, res) => {
  const { user_id, territory_id, forecast_type, period_type, period_start, period_end } = req.query;
  const filter: any = {};

  if (user_id) filter.user_id = user_id;
  if (territory_id) filter.territory_id = territory_id;
  if (forecast_type) filter.forecast_type = forecast_type;
  if (period_type) filter.period_type = period_type;
  if (period_start) filter.period_start = { $gte: period_start };
  if (period_end) filter.period_end = { $lte: period_end };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    SalesForecast.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, SalesForecast
  );

  res.json(paginatedResult);
}));

// Get forecast by ID
router.get('/forecasts/:id', asyncHandler(async (req, res) => {
  const forecast = await SalesForecast.findById(req.params.id).lean();

  if (!forecast) {
    return res.status(404).json({ error: 'Forecast not found' });
  }

  res.json(forecast);
}));

// Create forecast
router.post('/forecasts', asyncHandler(async (req, res) => {
  const {
    forecast_name, forecast_type, period_type, period_start, period_end,
    user_id, territory_id, forecasted_amount, forecasted_quantity,
    confidence_level, forecast_method, notes, forecast_lines,
  } = req.body;

  const lines = (forecast_lines || []).map((line: any) => ({
    product_id: line.product_id,
    opportunity_id: line.opportunity_id,
    forecasted_amount: line.forecasted_amount,
    forecasted_quantity: line.forecasted_quantity,
    probability: line.probability,
  }));

  const forecast = await SalesForecast.create({
    forecast_name,
    forecast_type,
    period_type,
    period_start,
    period_end,
    user_id,
    territory_id,
    forecasted_amount,
    forecasted_quantity,
    confidence_level,
    forecast_method: forecast_method || 'manual',
    notes,
    forecast_lines: lines,
  });

  res.status(201).json(forecast);
}));

// Update forecast with actuals
router.put('/forecasts/:id/actuals', asyncHandler(async (req, res) => {
  const { actual_amount, actual_quantity } = req.body;

  const updateData: any = {};
  if (actual_amount !== undefined) updateData.actual_amount = actual_amount;
  if (actual_quantity !== undefined) updateData.actual_quantity = actual_quantity;

  const forecast = await SalesForecast.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!forecast) {
    return res.status(404).json({ error: 'Forecast not found' });
  }

  res.json(forecast);
}));

// Generate pipeline-based forecast
router.post('/forecasts/pipeline', asyncHandler(async (req, res) => {
  const { period_start, period_end, user_id, territory_id } = req.body;

  const filter: any = {
    type: 'opportunity',
    stage: { $nin: ['won', 'lost'] },
    date_deadline: { $gte: new Date(period_start), $lte: new Date(period_end) },
  };
  if (user_id) filter.user_id = user_id;

  const opportunities = await Lead.find(filter).lean();

  const forecastedAmount = opportunities.reduce((sum, opp) => {
    return sum + ((opp.expected_revenue || 0) * (opp.probability || 0) / 100);
  }, 0);

  res.json({
    forecasted_amount: forecastedAmount,
    forecasted_quantity: opportunities.length,
    opportunity_count: opportunities.length,
    opportunities,
  });
}));

// ============================================
// SALES TARGETS
// ============================================

// Get all targets
router.get('/targets', asyncHandler(async (req, res) => {
  const { user_id, team_id, territory_id, period_type, period_start, period_end } = req.query;
  const filter: any = {};

  if (user_id) filter.user_id = user_id;
  if (team_id) filter.team_id = team_id;
  if (territory_id) filter.territory_id = territory_id;
  if (period_type) filter.period_type = period_type;
  if (period_start) filter.period_start = { $gte: period_start };
  if (period_end) filter.period_end = { $lte: period_end };

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    SalesTarget.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, SalesTarget
  );

  res.json(paginatedResult);
}));

// Create target
router.post('/targets', asyncHandler(async (req, res) => {
  const {
    target_name, user_id, team_id, territory_id, product_id,
    period_type, period_start, period_end, revenue_target,
    quantity_target, deal_count_target,
  } = req.body;

  const target = await SalesTarget.create({
    target_name,
    user_id,
    team_id,
    territory_id,
    product_id,
    period_type,
    period_start,
    period_end,
    revenue_target,
    quantity_target,
    deal_count_target,
  });

  res.status(201).json(target);
}));

// Update target achievements
router.put('/targets/:id/achievements', asyncHandler(async (req, res) => {
  const { achievement_revenue, achievement_quantity, achievement_deal_count } = req.body;

  const updateData: any = {};
  if (achievement_revenue !== undefined) updateData.achievement_revenue = achievement_revenue;
  if (achievement_quantity !== undefined) updateData.achievement_quantity = achievement_quantity;
  if (achievement_deal_count !== undefined) updateData.achievement_deal_count = achievement_deal_count;

  const target = await SalesTarget.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!target) {
    return res.status(404).json({ error: 'Target not found' });
  }

  const achievement_percentage = target.revenue_target ? (target.achievement_revenue / target.revenue_target) * 100 : 0;

  res.json({
    ...target.toJSON(),
    achievement_percentage: achievement_percentage.toFixed(2),
  });
}));

// Auto-calculate achievements from sales orders
router.post('/targets/:id/calculate-achievements', asyncHandler(async (req, res) => {
  const target = await SalesTarget.findById(req.params.id);
  if (!target) {
    return res.status(404).json({ error: 'Target not found' });
  }

  const orderFilter: any = {
    state: { $in: ['sale', 'done'] },
    date_order: { $gte: target.period_start, $lte: target.period_end },
  };
  if (target.user_id) orderFilter.user_id = target.user_id;

  const orders = await SaleOrder.find(orderFilter).lean();

  const total_revenue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
  const total_quantity = orders.reduce((sum, o) => {
    return sum + o.order_line.reduce((lineSum, l) => lineSum + (l.product_uom_qty || 0), 0);
  }, 0);
  const total_orders = orders.length;

  const updated = await SalesTarget.findByIdAndUpdate(
    req.params.id,
    { achievement_revenue: total_revenue, achievement_quantity: total_quantity, achievement_deal_count: total_orders },
    { new: true }
  );

  if (!updated) {
    return res.status(404).json({ error: 'Target not found' });
  }

  const achievement_percentage = updated.revenue_target ? (updated.achievement_revenue / updated.revenue_target) * 100 : 0;

  res.json({
    ...updated.toJSON(),
    achievement_percentage: achievement_percentage.toFixed(2),
  });
}));

export default router;
