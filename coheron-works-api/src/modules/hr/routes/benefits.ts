import express from 'express';
import { BenefitPlan } from '../models/BenefitPlan.js';
import { BenefitEnrollment } from '../models/BenefitEnrollment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// BENEFIT PLANS
// ============================================

router.get('/plans', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.plan_year) filter.plan_year = parseInt(req.query.plan_year as string);
  if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
  const plans = await BenefitPlan.find(filter).sort({ created_at: -1 }).lean();
  res.json(plans);
}));

router.get('/plans/:id', asyncHandler(async (req, res) => {
  const plan = await BenefitPlan.findById(req.params.id).lean();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

router.post('/plans', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plan = await BenefitPlan.create({ ...req.body, tenant_id });
  res.status(201).json(plan);
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  const plan = await BenefitPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

router.delete('/plans/:id', asyncHandler(async (req, res) => {
  const plan = await BenefitPlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ message: 'Plan deleted successfully' });
}));

// Plan enrollments
router.get('/plans/:id/enrollments', asyncHandler(async (req, res) => {
  const enrollments = await BenefitEnrollment.find({ plan_id: req.params.id }).populate('employee_id', 'name email').sort({ created_at: -1 }).lean();
  res.json(enrollments);
}));

// Employee benefits
router.get('/employees/:employeeId/benefits', asyncHandler(async (req, res) => {
  const enrollments = await BenefitEnrollment.find({ employee_id: req.params.employeeId, status: { $in: ['pending', 'active'] } }).populate('plan_id').sort({ effective_date: -1 }).lean();
  res.json(enrollments);
}));

// Cost summary
router.get('/cost-summary', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const planYear = parseInt(req.query.plan_year as string) || new Date().getFullYear();
  const plans = await BenefitPlan.find({ tenant_id, plan_year: planYear }).lean();
  const summary = [];
  let totalEmployeeCost = 0;
  let totalEmployerCost = 0;
  for (const plan of plans) {
    const enrollments = await BenefitEnrollment.find({ plan_id: plan._id, status: 'active' }).lean();
    const empCost = enrollments.reduce((s, e) => s + e.employee_contribution, 0);
    const erCost = enrollments.reduce((s, e) => s + e.employer_contribution, 0);
    totalEmployeeCost += empCost;
    totalEmployerCost += erCost;
    summary.push({ plan_id: plan._id, name: plan.name, type: plan.type, enrollments: enrollments.length, employee_cost: empCost, employer_cost: erCost, total_cost: empCost + erCost });
  }
  res.json({ plan_year: planYear, plans: summary, totals: { employee_cost: totalEmployeeCost, employer_cost: totalEmployerCost, total: totalEmployeeCost + totalEmployerCost } });
}));

// Open enrollment
router.post('/open-enrollment', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { plan_year } = req.body;
  const plans = await BenefitPlan.find({ tenant_id, plan_year });
  const now = new Date();
  let opened = 0;
  for (const plan of plans) {
    if (!plan.is_active) continue;
    plan.enrollment_start = req.body.enrollment_start || now;
    plan.enrollment_end = req.body.enrollment_end || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await plan.save();
    opened++;
  }
  res.json({ message: `Open enrollment started for ${opened} plans`, plan_year });
}));

// ============================================
// BENEFIT ENROLLMENTS
// ============================================

router.get('/enrollments', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.plan_id) filter.plan_id = req.query.plan_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  const enrollments = await BenefitEnrollment.find(filter).populate('plan_id', 'name type').populate('employee_id', 'name email').sort({ created_at: -1 }).lean();
  res.json(enrollments);
}));

router.get('/enrollments/:id', asyncHandler(async (req, res) => {
  const enrollment = await BenefitEnrollment.findById(req.params.id).populate('plan_id').populate('employee_id', 'name email').lean();
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json(enrollment);
}));

router.post('/enrollments', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const enrollment = await BenefitEnrollment.create({ ...req.body, tenant_id });
  res.status(201).json(enrollment);
}));

router.put('/enrollments/:id', asyncHandler(async (req, res) => {
  const enrollment = await BenefitEnrollment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json(enrollment);
}));

router.delete('/enrollments/:id', asyncHandler(async (req, res) => {
  const enrollment = await BenefitEnrollment.findByIdAndDelete(req.params.id);
  if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' });
  res.json({ message: 'Enrollment deleted successfully' });
}));

export default router;
