import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import Budget from '../../../models/Budget.js';

const router = express.Router();

// List budgets
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { status, fiscal_year_id, page = '1', limit = '20' } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  if (fiscal_year_id) filter.fiscal_year_id = fiscal_year_id;
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Budget.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    Budget.countDocuments(filter),
  ]);
  res.json({ items, total, page: Number(page), limit: Number(limit) });
}));

// Summary across all budgets
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  const budgets = await Budget.find(filter).lean();
  let total_budgeted = 0;
  let total_budgets = budgets.length;
  const by_status: Record<string, number> = {};
  for (const b of budgets) {
    for (const line of (b as any).lines || []) {
      total_budgeted += line.budgeted_amount || 0;
    }
    by_status[(b as any).status] = (by_status[(b as any).status] || 0) + 1;
  }
  res.json({ total_budgets, total_budgeted, by_status });
}));

// Get single budget
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Budget.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Budget not found' });
  res.json(item);
}));

// Create budget
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const item = await Budget.create({ ...req.body, tenant_id });
  res.status(201).json(item);
}));

// Update budget
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).lean();
  if (!item) return res.status(404).json({ error: 'Budget not found' });
  res.json(item);
}));

// Delete budget
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Budget.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ error: 'Budget not found' });
  res.json({ success: true });
}));

// Approve budget
router.post('/:id/approve', authenticate, asyncHandler(async (req, res) => {
  const item = await Budget.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true }).lean();
  if (!item) return res.status(404).json({ error: 'Budget not found' });
  res.json(item);
}));

// Variance report
router.get('/:id/variance-report', authenticate, asyncHandler(async (req, res) => {
  const budget = await Budget.findById(req.params.id).lean();
  if (!budget) return res.status(404).json({ error: 'Budget not found' });
  // Return lines with variance placeholder (actual amounts would come from journal entries)
  const lines = ((budget as any).lines || []).map((line: any) => ({
    account_id: line.account_id,
    cost_center_id: line.cost_center_id,
    period: line.period,
    budgeted_amount: line.budgeted_amount,
    actual_amount: 0, // Would be computed from journal entries
    variance: line.budgeted_amount,
    variance_percentage: 100,
  }));
  res.json({ budget_id: budget._id, name: (budget as any).name, lines });
}));

export default router;
