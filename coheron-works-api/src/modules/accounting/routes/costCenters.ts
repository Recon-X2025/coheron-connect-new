import { Router } from 'express';
import CostCenter from '../../../models/CostCenter.js';
import CostAllocationRule from '../../../models/CostAllocationRule.js';
import CostAllocationEntry from '../../../models/CostAllocationEntry.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

// ── Cost Centers ──

// GET / - List cost centers (tree structure)
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const centers = await CostCenter.find({ tenant_id: req.user.tenant_id })
    .populate('manager_id', 'name')
    .sort({ code: 1 })
    .lean();

  // Build tree
  const map: Record<string, any> = {};
  const roots: any[] = [];
  for (const c of centers) {
    (c as any).children = [];
    map[(c as any)._id.toString()] = c;
  }
  for (const c of centers) {
    if ((c as any).parent_id && map[(c as any).parent_id.toString()]) {
      map[(c as any).parent_id.toString()].children.push(c);
    } else {
      roots.push(c);
    }
  }
  res.json({ data: roots });
}));

// POST / - Create cost center
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const center = await CostCenter.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(center);
}));

// GET /:id - Get with budget vs actual
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const center = await CostCenter.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('manager_id', 'name')
    .populate('parent_id', 'name code');
  if (!center) return res.status(404).json({ error: 'Cost center not found' });

  const variance = (center as any).budget_amount - (center as any).actual_amount;
  res.json({ data: center, budget_variance: variance, variance_pct: (center as any).budget_amount ? (variance / (center as any).budget_amount * 100).toFixed(2) : 0 });
}));

// PUT /:id - Update
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const center = await CostCenter.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!center) return res.status(404).json({ error: 'Cost center not found' });
  res.json(center);
}));

// DELETE /:id - Delete (if no allocations)
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const hasAllocations = await CostAllocationEntry.exists({
    tenant_id: req.user.tenant_id,
    '$or': [{ source_cost_center_id: req.params.id }, { 'entries.target_cost_center_id': req.params.id }],
  });
  if (hasAllocations) return res.status(400).json({ error: 'Cannot delete cost center with existing allocations' });

  const hasChildren = await CostCenter.exists({ tenant_id: req.user.tenant_id, parent_id: req.params.id });
  if (hasChildren) return res.status(400).json({ error: 'Cannot delete cost center with children' });

  const center = await CostCenter.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!center) return res.status(404).json({ error: 'Cost center not found' });
  res.json({ message: 'Cost center deleted' });
}));

// GET /:id/report - P&L report for cost center (date range)
router.get('/:id/report', authenticate, asyncHandler(async (req: any, res) => {
  const { start_date, end_date } = req.query;
  const entries = await CostAllocationEntry.find({
    tenant_id: req.user.tenant_id,
    '$or': [{ source_cost_center_id: req.params.id }, { 'entries.target_cost_center_id': req.params.id }],
    period_start: { '$gte': new Date(start_date as string) },
    period_end: { '$lte': new Date(end_date as string) },
    status: 'posted',
  }).lean();

  let totalAllocatedOut = 0;
  let totalAllocatedIn = 0;
  for (const entry of entries) {
    if ((entry as any).source_cost_center_id.toString() === req.params.id) {
      totalAllocatedOut += (entry as any).total_amount;
    }
    for (const e of (entry as any).entries) {
      if (e.target_cost_center_id.toString() === req.params.id) {
        totalAllocatedIn += e.amount;
      }
    }
  }

  res.json({ data: { cost_center_id: req.params.id, start_date, end_date, allocated_out: totalAllocatedOut, allocated_in: totalAllocatedIn, net: totalAllocatedIn - totalAllocatedOut, entries } });
}));

// ── Allocation Rules ──

// GET /allocation-rules - List allocation rules
router.get('/allocation-rules', authenticate, asyncHandler(async (req: any, res) => {
  const rules = await CostAllocationRule.find({ tenant_id: req.user.tenant_id })
    .populate('source_cost_center_id', 'name code')
    .sort({ name: 1 });
  res.json({ data: rules });
}));

// POST /allocation-rules - Create rule
router.post('/allocation-rules', authenticate, asyncHandler(async (req: any, res) => {
  const rule = await CostAllocationRule.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(rule);
}));

// PUT /allocation-rules/:id - Update rule
router.put('/allocation-rules/:id', authenticate, asyncHandler(async (req: any, res) => {
  const rule = await CostAllocationRule.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!rule) return res.status(404).json({ error: 'Allocation rule not found' });
  res.json(rule);
}));

// POST /allocation-rules/:id/run - Execute allocation
router.post('/allocation-rules/:id/run', authenticate, asyncHandler(async (req: any, res) => {
  const rule = await CostAllocationRule.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!rule) return res.status(404).json({ error: 'Allocation rule not found' });

  const { period_start, period_end } = req.body;
  const allocationEntries: any[] = [];
  let totalAmount = 0;

  for (const target of (rule as any).targets) {
    let amount = 0;
    if ((rule as any).allocation_type === 'percentage') {
      amount = ((target.percentage || 0) / 100) * (req.body.source_amount || 0);
    } else if ((rule as any).allocation_type === 'fixed') {
      amount = target.fixed_amount || 0;
    }
    for (const accountId of (rule as any).account_ids) {
      allocationEntries.push({
        target_cost_center_id: target.cost_center_id,
        account_id: accountId,
        amount,
        percentage: target.percentage,
      });
      totalAmount += amount;
    }
  }

  const entry = await CostAllocationEntry.create({
    tenant_id: req.user.tenant_id,
    rule_id: rule._id,
    period_start: new Date(period_start),
    period_end: new Date(period_end),
    source_cost_center_id: (rule as any).source_cost_center_id,
    entries: allocationEntries,
    total_amount: totalAmount,
    status: 'draft',
    created_by: req.user._id,
  });

  await CostAllocationRule.findByIdAndUpdate(rule._id, { last_run_at: new Date() });

  res.status(201).json(entry);
}));

// GET /allocation-entries - List allocation history
router.get('/allocation-entries', authenticate, asyncHandler(async (req: any, res) => {
  const { rule_id, status } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (rule_id) filter.rule_id = rule_id;
  if (status) filter.status = status;

  const entries = await CostAllocationEntry.find(filter)
    .populate('rule_id', 'name')
    .populate('source_cost_center_id', 'name code')
    .sort({ created_at: -1 });
  res.json({ data: entries });
}));

export default router;
