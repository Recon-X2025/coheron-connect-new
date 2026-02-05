import express from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const Lead = mongoose.model('Lead');
const router = express.Router();

// GET / - scoring config
router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const config = {
    weights: { demographic: 25, behavioral: 25, engagement: 25, recency: 25 },
    grades: [
      { grade: 'A', min: 80 },
      { grade: 'B', min: 60 },
      { grade: 'C', min: 40 },
      { grade: 'D', min: 20 },
      { grade: 'F', min: 0 },
    ],
  };
  res.json(config);
}));

function computeScore(lead: any) {
  const bd = lead.score_breakdown || {};
  const demographic = Math.min(bd.demographic || 0, 25);
  const behavioral = Math.min(bd.behavioral || 0, 25);
  const engagement = Math.min(bd.engagement || 0, 25);
  const recency = Math.min(bd.recency || 0, 25);
  const total = demographic + behavioral + engagement + recency;
  let grade = 'F';
  if (total >= 80) grade = 'A';
  else if (total >= 60) grade = 'B';
  else if (total >= 40) grade = 'C';
  else if (total >= 20) grade = 'D';
  return { score: total, grade, breakdown: { demographic, behavioral, engagement, recency } };
}

// POST /score/:leadId - score single lead
router.post('/score/:leadId', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const lead = await Lead.findOne({ _id: req.params.leadId, ...(tenantId ? { tenant_id: tenantId } : {}) });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const result = computeScore(lead);
  lead.score = result.score;
  lead.score_grade = result.grade;
  lead.last_scored_at = new Date();
  await lead.save();
  res.json({ lead_id: lead._id, ...result, last_scored_at: lead.last_scored_at });
}));

// POST /score-batch - score multiple leads
router.post('/score-batch', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const { lead_ids } = req.body;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (lead_ids?.length) filter._id = { $in: lead_ids };
  const leads = await Lead.find(filter).limit(500);
  const results: any[] = [];
  for (const lead of leads) {
    const result = computeScore(lead);
    lead.score = result.score;
    lead.score_grade = result.grade;
    lead.last_scored_at = new Date();
    await lead.save();
    results.push({ lead_id: lead._id, name: lead.name, ...result });
  }
  res.json({ scored: results.length, results });
}));

// GET /leaderboard - top scored leads
router.get('/leaderboard', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.grade) filter.score_grade = req.query.grade;
  const leads = await Lead.find(filter)
    .sort({ score: -1 })
    .limit(limit)
    .select('name email company_name score score_grade score_breakdown last_scored_at stage expected_revenue')
    .lean();
  res.json(leads);
}));

export default router;
