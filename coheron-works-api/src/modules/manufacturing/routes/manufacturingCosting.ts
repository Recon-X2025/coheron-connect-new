import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import MoCosting from '../../../models/MoCosting.js';
import MoMaterialConsumption from '../../../models/MoMaterialConsumption.js';
import MoSubcontracting from '../../../models/MoSubcontracting.js';
import MoOeeTracking from '../../../models/MoOeeTracking.js';
import MoKpiSummary from '../../../models/MoKpiSummary.js';
import ManufacturingOrder from '../../../models/ManufacturingOrder.js';
import WorkOrder from '../../../models/WorkOrder.js';
import Product from '../../../shared/models/Product.js';

const router = express.Router();

// ============================================
// MANUFACTURING COSTING - CRUD & Analytics
// ============================================

// Get costing for MO
router.get('/:mo_id', asyncHandler(async (req, res) => {
  const { mo_id } = req.params;

  const costs = await MoCosting.find({ mo_id }).sort({ cost_type: 1 }).lean();

  // Calculate totals
  const totals = costs.reduce(
    (acc: any, row: any) => ({
      standard_total: acc.standard_total + (row.standard_cost || 0),
      actual_total: acc.actual_total + (row.actual_cost || 0),
      variance_total: acc.variance_total + (row.variance || 0),
    }),
    { standard_total: 0, actual_total: 0, variance_total: 0 }
  );

  res.json({
    costs,
    totals,
    variance_percent:
      totals.standard_total > 0
        ? (totals.variance_total / totals.standard_total) * 100
        : 0,
  });
}));

// Calculate and update costing for MO
router.post('/:mo_id/calculate', asyncHandler(async (req, res) => {
  const { mo_id } = req.params;

  const mo = await ManufacturingOrder.findById(mo_id).lean();

  if (!mo) {
    return res.status(404).json({ error: 'Manufacturing order not found' });
  }

  // Get material consumption with product standard price
  const materialConsumptions = await MoMaterialConsumption.find({
    mo_id,
    state: 'done',
  })
    .populate('product_id', 'standard_price')
    .lean();

  // Calculate material cost
  let materialCost = 0;
  for (const item of materialConsumptions) {
    const qty = item.product_uom_qty || 0;
    const price = (item as any).product_id?.standard_price || 0;
    materialCost += qty * price;
  }

  // Get labor costs from work orders
  const workOrders = await WorkOrder.find({ mo_id, state: 'done' })
    .populate('workcenter_id', 'costs_hour')
    .lean();

  let laborCost = 0;
  for (const wo of workOrders) {
    const hours = (wo as any).duration || 0;
    const hourlyRate = (wo as any).workcenter_id?.costs_hour || 0;
    laborCost += hours * hourlyRate;
  }

  // Calculate overhead (simplified - can be enhanced)
  const overheadCost = laborCost * 0.3; // 30% overhead

  // Get scrap cost
  const scrapQty = mo.qty_scrapped || 0;
  const product = await Product.findById(mo.product_id).select('standard_price').lean();
  const scrapCost = scrapQty * ((product as any)?.standard_price || 0);

  // Get subcontracting costs
  const subcontractAgg = await MoSubcontracting.aggregate([
    { $match: { mo_id: mo._id, state: 'done' } },
    { $group: { _id: null, total_cost: { $sum: '$cost' } } },
  ]);
  const subcontractCost = subcontractAgg[0]?.total_cost || 0;

  const totalCost = materialCost + laborCost + overheadCost + scrapCost + subcontractCost;

  // Update or insert costing records
  const costTypes = [
    { type: 'material', cost: materialCost },
    { type: 'labor', cost: laborCost },
    { type: 'overhead', cost: overheadCost },
    { type: 'scrap', cost: scrapCost },
    { type: 'subcontract', cost: subcontractCost },
    { type: 'total', cost: totalCost },
  ];

  for (const costType of costTypes) {
    let standardCost = 0;
    if (costType.type === 'material') {
      standardCost = materialCost;
    } else if (costType.type === 'total') {
      const qty = mo.product_qty || 0;
      standardCost = qty * ((product as any)?.standard_price || 0);
    }

    const variance = costType.cost - standardCost;
    const variancePercent = standardCost > 0 ? (variance / standardCost) * 100 : 0;

    await MoCosting.findOneAndUpdate(
      { mo_id, cost_type: costType.type },
      {
        mo_id,
        cost_type: costType.type,
        standard_cost: standardCost,
        actual_cost: costType.cost,
        variance,
        variance_percent: variancePercent,
      },
      { upsert: true, new: true }
    );
  }

  res.json({ message: 'Costing calculated successfully', total_cost: totalCost });
}));

// Get costing analytics
router.get('/analytics/summary', asyncHandler(async (req, res) => {
  const { date_from, date_to, product_id } = req.query;

  // Build MO filter for date/product filtering
  const moFilter: any = {};
  if (date_from || date_to) {
    moFilter.date_finished = {};
    if (date_from) moFilter.date_finished.$gte = new Date(date_from as string);
    if (date_to) moFilter.date_finished.$lte = new Date(date_to as string);
  }
  if (product_id) moFilter.product_id = product_id;

  // Get matching MO IDs
  let moIds: any[] | null = null;
  if (Object.keys(moFilter).length > 0) {
    const mos = await ManufacturingOrder.find(moFilter).select('_id').lean();
    moIds = mos.map((m: any) => m._id);
  }

  const costingFilter: any = {};
  if (moIds) costingFilter.mo_id = { $in: moIds };

  // Summary for 'total' cost_type
  const summaryPipeline: any[] = [
    { $match: { ...costingFilter, cost_type: 'total' } },
    {
      $group: {
        _id: null,
        total_mos: { $addToSet: '$mo_id' },
        total_standard_cost: { $sum: '$standard_cost' },
        total_actual_cost: { $sum: '$actual_cost' },
        total_variance: { $sum: '$variance' },
        avg_variance_percent: { $avg: '$variance_percent' },
      },
    },
    {
      $project: {
        _id: 0,
        total_mos: { $size: '$total_mos' },
        total_standard_cost: 1,
        total_actual_cost: 1,
        total_variance: 1,
        avg_variance_percent: 1,
      },
    },
  ];

  const summaryResult = await MoCosting.aggregate(summaryPipeline);
  const summary = summaryResult[0] || {
    total_mos: 0,
    total_standard_cost: 0,
    total_actual_cost: 0,
    total_variance: 0,
    avg_variance_percent: 0,
  };

  // Breakdown by cost_type (excluding 'total')
  const breakdownPipeline: any[] = [
    { $match: { ...costingFilter, cost_type: { $ne: 'total' } } },
    {
      $group: {
        _id: '$cost_type',
        total_standard: { $sum: '$standard_cost' },
        total_actual: { $sum: '$actual_cost' },
        total_variance: { $sum: '$variance' },
      },
    },
    {
      $project: {
        _id: 0,
        cost_type: '$_id',
        total_standard: 1,
        total_actual: 1,
        total_variance: 1,
      },
    },
  ];

  const breakdown = await MoCosting.aggregate(breakdownPipeline);

  res.json({ summary, breakdown });
}));

// Get OEE tracking
router.get('/oee/tracking', asyncHandler(async (req, res) => {
  const { workcenter_id, date_from, date_to } = req.query;
  const filter: any = {};

  if (workcenter_id) filter.workcenter_id = workcenter_id;
  if (date_from || date_to) {
    filter.date_tracked = {};
    if (date_from) filter.date_tracked.$gte = new Date(date_from as string);
    if (date_to) filter.date_tracked.$lte = new Date(date_to as string);
  }

  const tracking = await MoOeeTracking.find(filter)
    .populate('workcenter_id', 'name')
    .populate('workorder_id', 'name')
    .sort({ date_tracked: -1, workcenter_id: 1 })
    .lean();

  const result = tracking.map((oee: any) => ({
    ...oee,
    workcenter_name: oee.workcenter_id?.name,
    workorder_name: oee.workorder_id?.name,
  }));

  // Calculate averages
  const averages = result.reduce(
    (acc: any, row: any) => ({
      availability: acc.availability + (row.availability_percent || 0),
      performance: acc.performance + (row.performance_percent || 0),
      quality: acc.quality + (row.quality_percent || 0),
      oee: acc.oee + (row.oee_percent || 0),
      count: acc.count + 1,
    }),
    { availability: 0, performance: 0, quality: 0, oee: 0, count: 0 }
  );

  const avgCount = averages.count || 1;

  res.json({
    tracking: result,
    averages: {
      availability: averages.availability / avgCount,
      performance: averages.performance / avgCount,
      quality: averages.quality / avgCount,
      oee: averages.oee / avgCount,
    },
  });
}));

// Get KPI summary
router.get('/kpi/:mo_id', asyncHandler(async (req, res) => {
  const { mo_id } = req.params;

  const result = await MoKpiSummary.find({ mo_id }).sort({ metric_name: 1 }).lean();

  res.json(result);
}));

export default router;
