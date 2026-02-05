import express from 'express';
import { CompensationPlan } from '../models/CompensationPlan.js';
import { CompensationReview } from '../models/CompensationReview.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// ============================================
// COMPENSATION PLANS
// ============================================

router.get('/plans', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.fiscal_year) filter.fiscal_year = parseInt(req.query.fiscal_year as string);
  const plans = await CompensationPlan.find(filter).sort({ created_at: -1 }).lean();
  res.json(plans);
}));

router.get('/plans/:id', authenticate, asyncHandler(async (req, res) => {
  const plan = await CompensationPlan.findById(req.params.id).lean();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

router.post('/plans', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plan = await CompensationPlan.create({ ...req.body, tenant_id });
  res.status(201).json(plan);
}));

router.put('/plans/:id', authenticate, asyncHandler(async (req, res) => {
  const plan = await CompensationPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

router.delete('/plans/:id', authenticate, asyncHandler(async (req, res) => {
  const plan = await CompensationPlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ message: 'Plan deleted successfully' });
}));

// Plan summary
router.get('/plans/:planId/summary', authenticate, asyncHandler(async (req, res) => {
  const plan = await CompensationPlan.findById(req.params.planId).lean();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const reviews = await CompensationReview.find({ plan_id: req.params.planId }).lean();
  const approved = reviews.filter(r => r.status === 'approved');
  const totalIncrease = approved.reduce((s, r) => s + (r.proposed_salary - r.current_salary), 0);
  res.json({
    plan,
    total_reviews: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: approved.length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    total_increase_amount: totalIncrease,
    avg_increase_pct: approved.length ? approved.reduce((s, r) => s + r.increase_pct, 0) / approved.length : 0,
  });
}));

// Budget utilization
router.get('/budget-utilization', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plans = await CompensationPlan.find({ tenant_id, status: 'active' }).lean();
  const result = [];
  for (const plan of plans) {
    const reviews = await CompensationReview.find({ plan_id: plan._id, status: 'approved' }).lean();
    const used = reviews.reduce((s, r) => s + (r.proposed_salary - r.current_salary), 0);
    result.push({ plan_id: plan._id, name: plan.name, total_budget: plan.total_budget, used_budget: used, remaining: plan.total_budget - used, utilization_pct: plan.total_budget ? Math.round((used / plan.total_budget) * 10000) / 100 : 0 });
  }
  res.json(result);
}));

// ============================================
// COMPENSATION REVIEWS
// ============================================

router.get('/reviews', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.plan_id) filter.plan_id = req.query.plan_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.increase_type) filter.increase_type = req.query.increase_type;
  const reviews = await CompensationReview.find(filter).populate('employee_id', 'name email').populate('manager_id', 'name').sort({ created_at: -1 }).lean();
  res.json(reviews);
}));

router.get('/reviews/:id', authenticate, asyncHandler(async (req, res) => {
  const review = await CompensationReview.findById(req.params.id).populate('employee_id', 'name email').lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json(review);
}));

router.post('/reviews', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const review = await CompensationReview.create({ ...req.body, tenant_id });
  res.status(201).json(review);
}));

router.put('/reviews/:id', authenticate, asyncHandler(async (req, res) => {
  const review = await CompensationReview.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json(review);
}));

router.delete('/reviews/:id', authenticate, asyncHandler(async (req, res) => {
  const review = await CompensationReview.findByIdAndDelete(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ message: 'Review deleted successfully' });
}));

router.post('/reviews/:id/approve', authenticate, asyncHandler(async (req, res) => {
  const review = await CompensationReview.findById(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });
  review.status = req.body.status || 'approved';
  review.approved_by = req.user?.userId as any;
  await review.save();
  res.json(review);
}));

export default router;
