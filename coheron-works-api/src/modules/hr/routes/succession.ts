import express from 'express';
import { SuccessionPlan } from '../models/SuccessionPlan.js';
import { SuccessionCandidate } from '../models/SuccessionCandidate.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// ============================================
// SUCCESSION PLANS
// ============================================

router.get('/plans', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.criticality) filter.criticality = req.query.criticality;
  const plans = await SuccessionPlan.find(filter).populate('incumbent_id', 'name email').sort({ created_at: -1 }).lean();
  res.json(plans);
}));

router.get('/plans/:id', authenticate, asyncHandler(async (req, res) => {
  const plan = await SuccessionPlan.findById(req.params.id).populate('incumbent_id', 'name email').lean();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

router.post('/plans', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plan = await SuccessionPlan.create({ ...req.body, tenant_id });
  res.status(201).json(plan);
}));

router.put('/plans/:id', authenticate, asyncHandler(async (req, res) => {
  const plan = await SuccessionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

router.delete('/plans/:id', authenticate, asyncHandler(async (req, res) => {
  const plan = await SuccessionPlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ message: 'Plan deleted successfully' });
}));

// Pipeline for a plan
router.get('/plans/:id/pipeline', authenticate, asyncHandler(async (req, res) => {
  const plan = await SuccessionPlan.findById(req.params.id).populate('incumbent_id', 'name email').lean();
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const candidates = await SuccessionCandidate.find({ plan_id: req.params.id }).populate('candidate_id', 'name email').populate('mentor_id', 'name').sort({ overall_rating: -1 }).lean();
  const byReadiness = { ready_now: 0, ready_1_year: 0, ready_2_years: 0, development_needed: 0 };
  candidates.forEach(c => { byReadiness[c.readiness as keyof typeof byReadiness]++; });
  res.json({ plan, candidates, readiness_summary: byReadiness });
}));

// Risk report
router.get('/risk-report', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plans = await SuccessionPlan.find({ tenant_id, status: 'active' }).populate('incumbent_id', 'name email').lean();
  const report = [];
  for (const plan of plans) {
    const candidateCount = await SuccessionCandidate.countDocuments({ plan_id: plan._id });
    const readyNow = await SuccessionCandidate.countDocuments({ plan_id: plan._id, readiness: 'ready_now' });
    report.push({
      plan_id: plan._id,
      position_title: plan.position_title,
      department: plan.department,
      criticality: plan.criticality,
      risk_of_loss: plan.risk_of_loss,
      impact_of_loss: plan.impact_of_loss,
      total_candidates: candidateCount,
      ready_now: readyNow,
      risk_score: (plan.risk_of_loss === 'high' ? 3 : plan.risk_of_loss === 'medium' ? 2 : 1) * (plan.impact_of_loss === 'high' ? 3 : plan.impact_of_loss === 'medium' ? 2 : 1),
    });
  }
  report.sort((a, b) => b.risk_score - a.risk_score);
  res.json(report);
}));

// Bench strength
router.get('/bench-strength', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const plans = await SuccessionPlan.find({ tenant_id, status: 'active' }).lean();
  let totalPositions = plans.length;
  let withReadyCandidates = 0;
  let totalCandidates = 0;
  for (const plan of plans) {
    const count = await SuccessionCandidate.countDocuments({ plan_id: plan._id });
    const ready = await SuccessionCandidate.countDocuments({ plan_id: plan._id, readiness: 'ready_now' });
    totalCandidates += count;
    if (ready > 0) withReadyCandidates++;
  }
  res.json({
    total_positions: totalPositions,
    positions_with_ready_candidates: withReadyCandidates,
    bench_strength_pct: totalPositions ? Math.round((withReadyCandidates / totalPositions) * 100) : 0,
    total_candidates: totalCandidates,
    avg_candidates_per_position: totalPositions ? Math.round((totalCandidates / totalPositions) * 10) / 10 : 0,
  });
}));

// ============================================
// SUCCESSION CANDIDATES
// ============================================

router.get('/candidates', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.plan_id) filter.plan_id = req.query.plan_id;
  if (req.query.readiness) filter.readiness = req.query.readiness;
  const candidates = await SuccessionCandidate.find(filter).populate('candidate_id', 'name email').populate('mentor_id', 'name').sort({ overall_rating: -1 }).lean();
  res.json(candidates);
}));

router.get('/candidates/:id', authenticate, asyncHandler(async (req, res) => {
  const candidate = await SuccessionCandidate.findById(req.params.id).populate('candidate_id', 'name email').populate('mentor_id', 'name').lean();
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(candidate);
}));

router.post('/candidates', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const candidate = await SuccessionCandidate.create({ ...req.body, tenant_id });
  res.status(201).json(candidate);
}));

router.put('/candidates/:id', authenticate, asyncHandler(async (req, res) => {
  const candidate = await SuccessionCandidate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json(candidate);
}));

router.delete('/candidates/:id', authenticate, asyncHandler(async (req, res) => {
  const candidate = await SuccessionCandidate.findByIdAndDelete(req.params.id);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
  res.json({ message: 'Candidate deleted successfully' });
}));

export default router;
