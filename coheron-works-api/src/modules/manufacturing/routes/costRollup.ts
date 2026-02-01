import express from 'express';
import mongoose from 'mongoose';
import { CostRollup } from '../models/CostRollup.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// Compute multi-level cost rollup from BOM
router.post('/rollup/:productId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { productId } = req.params;

  // Try to load BOM for this product
  const BOM = mongoose.model('BillOfMaterial');
  const bom = await BOM.findOne({ tenant_id, product_id: productId }).populate('items.component_id').lean() as any;

  let materialCost = 0;
  const materialBreakdown: any[] = [];

  if (bom && bom.items) {
    for (const item of bom.items) {
      const unitCost = item.component_id?.standard_cost || item.unit_cost || 0;
      const qty = item.quantity || 1;
      const extCost = unitCost * qty;
      materialCost += extCost;
      materialBreakdown.push({
        component_id: item.component_id?._id || item.component_id,
        quantity: qty,
        unit_cost: unitCost,
        extended_cost: extCost,
        level: 1,
      });

      // Check for sub-BOMs (level 2)
      const subBom = await BOM.findOne({ tenant_id, product_id: item.component_id?._id || item.component_id }).populate('items.component_id').lean() as any;
      if (subBom && subBom.items) {
        for (const sub of subBom.items) {
          const subUnitCost = sub.component_id?.standard_cost || sub.unit_cost || 0;
          const subQty = (sub.quantity || 1) * qty;
          const subExtCost = subUnitCost * subQty;
          materialCost += subExtCost;
          materialBreakdown.push({
            component_id: sub.component_id?._id || sub.component_id,
            quantity: subQty,
            unit_cost: subUnitCost,
            extended_cost: subExtCost,
            level: 2,
          });
        }
      }
    }
  }

  // Load routing for labor costs
  let laborCost = 0;
  const laborBreakdown: any[] = [];
  try {
    const Routing = mongoose.model('Routing');
    const routing = await Routing.findOne({ tenant_id, product_id: productId }).lean() as any;
    if (routing && routing.operations) {
      for (const op of routing.operations) {
        const hours = op.cycle_time_minutes ? op.cycle_time_minutes / 60 : 0;
        const rate = op.labor_rate || req.body.default_labor_rate || 25;
        const cost = hours * rate;
        laborCost += cost;
        laborBreakdown.push({
          operation: op.name || op.operation_name,
          work_center: op.work_center_id?.toString() || '',
          hours,
          rate,
          cost,
        });
      }
    }
  } catch (_) { /* Routing model may not exist */ }

  const overheadRates = req.body.overhead_rates || { fixed_overhead_pct: 15, variable_overhead_pct: 10, applied_base: 'labor' };
  const baseForOverhead = overheadRates.applied_base === 'material' ? materialCost : laborCost;
  const overheadCost = baseForOverhead * ((overheadRates.fixed_overhead_pct + overheadRates.variable_overhead_pct) / 100);
  const subcontractingCost = req.body.subcontracting_cost || 0;
  const toolingCost = req.body.tooling_cost || 0;
  const totalCost = materialCost + laborCost + overheadCost + subcontractingCost + toolingCost;

  // Get latest version
  const latest = await CostRollup.findOne({ tenant_id, product_id: productId }).sort({ version: -1 }).lean();
  const version = latest ? latest.version + 1 : 1;

  const rollup = await CostRollup.create({
    tenant_id,
    product_id: productId,
    version,
    cost_components: {
      material_cost: materialCost,
      labor_cost: laborCost,
      overhead_cost: overheadCost,
      subcontracting_cost: subcontractingCost,
      tooling_cost: toolingCost,
      total_cost: totalCost,
    },
    material_breakdown: materialBreakdown,
    labor_breakdown: laborBreakdown,
    overhead_rates: overheadRates,
    effective_date: new Date(),
    status: 'draft',
    rolled_up_at: new Date(),
    created_by: req.user?.userId,
  });

  res.status(201).json(rollup);
}));

// Get latest rollup
router.get('/rollup/:productId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const rollup = await CostRollup.findOne({ tenant_id, product_id: req.params.productId })
    .sort({ version: -1 })
    .populate('product_id', 'name sku')
    .lean();
  if (!rollup) return res.status(404).json({ error: 'No cost rollup found' });
  res.json(rollup);
}));

// Freeze rollup
router.post('/rollup/:id/freeze', asyncHandler(async (req, res) => {
  const doc = await CostRollup.findByIdAndUpdate(req.params.id, { status: 'frozen' }, { new: true }).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
}));

// Variance: standard vs actual
router.get('/variance/:productId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const standard = await CostRollup.findOne({ tenant_id, product_id: req.params.productId, status: { $in: ['frozen', 'active'] } })
    .sort({ version: -1 }).lean();
  const actual = await CostRollup.findOne({ tenant_id, product_id: req.params.productId, status: 'draft' })
    .sort({ version: -1 }).lean();

  if (!standard && !actual) return res.status(404).json({ error: 'No rollups found' });

  const std = standard?.cost_components || { material_cost: 0, labor_cost: 0, overhead_cost: 0, subcontracting_cost: 0, tooling_cost: 0, total_cost: 0 };
  const act = actual?.cost_components || std;

  res.json({
    standard: std,
    actual: act,
    variance: {
      material_cost: act.material_cost - std.material_cost,
      labor_cost: act.labor_cost - std.labor_cost,
      overhead_cost: act.overhead_cost - std.overhead_cost,
      subcontracting_cost: act.subcontracting_cost - std.subcontracting_cost,
      tooling_cost: act.tooling_cost - std.tooling_cost,
      total_cost: act.total_cost - std.total_cost,
    },
  });
}));

// What-if: simulate material price change impact
router.get('/what-if', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { component_id, new_price } = req.query;
  if (!component_id || !new_price) return res.status(400).json({ error: 'component_id and new_price required' });

  const newPrice = parseFloat(new_price as string);

  // Find all rollups containing this component
  const rollups = await CostRollup.find({
    tenant_id,
    'material_breakdown.component_id': component_id,
  }).populate('product_id', 'name sku').lean();

  const impacts = rollups.map((r) => {
    const affected = r.material_breakdown.filter((m) => m.component_id?.toString() === component_id);
    let delta = 0;
    for (const m of affected) {
      delta += (newPrice - m.unit_cost) * m.quantity;
    }
    return {
      product_id: r.product_id,
      version: r.version,
      current_total: r.cost_components.total_cost,
      new_total: r.cost_components.total_cost + delta,
      delta,
    };
  });

  res.json({ component_id, new_price: newPrice, impacts });
}));

// Cost comparison across versions
router.get('/cost-comparison', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { product_id } = req.query;
  const filter: any = { tenant_id };
  if (product_id) filter.product_id = product_id;

  const rollups = await CostRollup.find(filter)
    .populate('product_id', 'name sku')
    .sort({ product_id: 1, version: 1 })
    .lean();

  res.json({ data: rollups });
}));

export default router;
