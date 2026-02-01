import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { PricingCondition } from '../models/PricingCondition.js';
import { PriceWaterfall } from '../models/PriceWaterfall.js';

const router = express.Router();

// List conditions
router.get('/conditions', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { condition_type, is_active, page = '1', limit = '50', search } = req.query;
  const filter: any = { tenant_id: tenantId };
  if (condition_type) filter.condition_type = condition_type;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (search) filter.name = { $regex: search, $options: 'i' };

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [items, total] = await Promise.all([
    PricingCondition.find(filter).sort({ priority: 1 }).skip(skip).limit(parseInt(limit as string)).lean(),
    PricingCondition.countDocuments(filter),
  ]);
  res.json({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// Get condition by ID
router.get('/conditions/:id', asyncHandler(async (req, res) => {
  const item = await PricingCondition.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!item) return res.status(404).json({ error: 'Condition not found' });
  res.json(item);
}));

// Create condition
router.post('/conditions', asyncHandler(async (req, res) => {
  const item = await PricingCondition.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(item);
}));

// Update condition
router.put('/conditions/:id', asyncHandler(async (req, res) => {
  const item = await PricingCondition.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Condition not found' });
  res.json(item);
}));

// Delete condition
router.delete('/conditions/:id', asyncHandler(async (req, res) => {
  const item = await PricingCondition.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!item) return res.status(404).json({ error: 'Condition not found' });
  res.json({ success: true });
}));

// Bulk import conditions
router.post('/conditions/bulk-import', asyncHandler(async (req, res) => {
  const { conditions } = req.body;
  if (!Array.isArray(conditions)) return res.status(400).json({ error: 'conditions must be an array' });
  const docs = conditions.map((c: any) => ({ ...c, tenant_id: req.user?.tenant_id }));
  const result = await PricingCondition.insertMany(docs);
  res.status(201).json({ imported: result.length });
}));

// Export conditions
router.get('/conditions/export', asyncHandler(async (req, res) => {
  const items = await PricingCondition.find({ tenant_id: req.user?.tenant_id }).sort({ priority: 1 }).lean();
  res.json({ conditions: items });
}));

// Helper: evaluate conditions and build waterfall
async function buildWaterfall(tenantId: any, productId: string, customerId: string | null, quantity: number, listPrice: number) {
  const now = new Date();
  const conditions = await PricingCondition.find({
    tenant_id: tenantId,
    is_active: true,
    $and: [
      { $or: [{ valid_from: { $exists: false } }, { valid_from: { $lte: now } }] },
      { $or: [{ valid_to: { $exists: false } }, { valid_to: { $gte: now } }] },
    ],
  }).sort({ priority: 1 }).lean();

  let runningTotal = listPrice;
  const steps: any[] = [];

  for (const cond of conditions) {
    // Check if condition dimensions match
    let matches = true;
    for (const dim of (cond.conditions || [])) {
      let actual: any;
      if (dim.dimension === 'product') actual = productId;
      else if (dim.dimension === 'customer') actual = customerId;
      else if (dim.dimension === 'quantity') actual = quantity;
      else if (dim.dimension === 'order_value') actual = runningTotal * quantity;
      else continue;

      if (dim.operator === 'eq' && String(actual) !== String(dim.value)) { matches = false; break; }
      if (dim.operator === 'neq' && String(actual) === String(dim.value)) { matches = false; break; }
      if (dim.operator === 'in' && Array.isArray(dim.value) && !dim.value.map(String).includes(String(actual))) { matches = false; break; }
      if (dim.operator === 'gt' && Number(actual) <= Number(dim.value)) { matches = false; break; }
      if (dim.operator === 'lt' && Number(actual) >= Number(dim.value)) { matches = false; break; }
      if (dim.operator === 'between' && Array.isArray(dim.value) && (Number(actual) < Number(dim.value[0]) || Number(actual) > Number(dim.value[1]))) { matches = false; break; }
    }
    if (!matches) continue;

    // Determine value from scale or direct
    let condValue = cond.value || 0;
    if (cond.scale && cond.scale.length > 0) {
      const scaleMatch = cond.scale.find((s: any) => quantity >= s.from && quantity <= s.to);
      if (scaleMatch) condValue = scaleMatch.value;
      else continue;
    }

    let adjustment = 0;
    if (cond.calculation_type === 'fixed') {
      adjustment = cond.condition_type === 'discount' ? -condValue : condValue;
    } else if (cond.calculation_type === 'percentage') {
      const pctAmount = (runningTotal * condValue) / 100;
      adjustment = cond.condition_type === 'discount' ? -pctAmount : pctAmount;
    }
    // formula type: simple eval with variables (safe subset)
    if (cond.calculation_type === 'formula' && cond.formula) {
      try {
        const fn = new Function('price', 'qty', 'value', `return ${cond.formula}`);
        adjustment = fn(runningTotal, quantity, condValue);
      } catch { /* skip bad formula */ }
    }

    runningTotal += adjustment;
    steps.push({
      condition_id: cond._id,
      condition_name: cond.name,
      condition_type: cond.condition_type,
      adjustment,
      running_total: Math.round(runningTotal * 100) / 100,
    });

    if (cond.exclusive) break;
  }

  const finalPrice = Math.round(runningTotal * 100) / 100;
  const marginPct = listPrice > 0 ? Math.round(((finalPrice / listPrice) * 100 - 100) * 100) / 100 : 0;

  return { list_price: listPrice, steps, final_price: finalPrice, margin_pct: marginPct };
}

// Simulate pricing
router.post('/simulate', asyncHandler(async (req, res) => {
  const { product_id, customer_id, quantity = 1, list_price = 0 } = req.body;
  const waterfall = await buildWaterfall(req.user?.tenant_id, product_id, customer_id, quantity, list_price);
  res.json(waterfall);
}));

// Calculate order pricing (all lines)
router.post('/calculate-order', asyncHandler(async (req, res) => {
  const { order_id, lines } = req.body;
  if (!Array.isArray(lines)) return res.status(400).json({ error: 'lines required' });

  const results = [];
  for (const line of lines) {
    const wf = await buildWaterfall(req.user?.tenant_id, line.product_id, line.customer_id, line.quantity, line.list_price);
    const saved = await PriceWaterfall.create({
      tenant_id: req.user?.tenant_id,
      product_id: line.product_id,
      customer_id: line.customer_id,
      order_id,
      calculated_at: new Date(),
      ...wf,
    });
    results.push(saved);
  }
  res.json({ lines: results });
}));

// Get waterfall for an order
router.get('/waterfall/:orderId', asyncHandler(async (req, res) => {
  const items = await PriceWaterfall.find({ order_id: req.params.orderId, tenant_id: req.user?.tenant_id }).lean();
  res.json(items);
}));

// Margin analysis
router.get('/margin-analysis', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { group_by = 'product' } = req.query;
  const groupField = group_by === 'customer' ? '$customer_id' : '$product_id';

  const analysis = await PriceWaterfall.aggregate([
    { $match: { tenant_id: tenantId } },
    { $group: {
      _id: groupField,
      avg_margin: { $avg: '$margin_pct' },
      avg_final_price: { $avg: '$final_price' },
      avg_list_price: { $avg: '$list_price' },
      count: { $sum: 1 },
    }},
    { $sort: { avg_margin: 1 } },
  ]);
  res.json(analysis);
}));

export default router;
