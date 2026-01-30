import express from 'express';
import { Lead, LeadActivity, LeadScoringHistory, CompetitorTracking, OpportunityDocument } from '../models/Lead.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get all leads
router.get('/', asyncHandler(async (req, res) => {
  const { type, stage, search } = req.query;
  const filter: any = {};

  if (type) filter.type = type;
  if (stage) filter.stage = stage;
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
      { email: { $regex: search as string, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Lead.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Lead
  );
  res.json(result);
}));

// Get lead by ID with activities and related data
router.get('/:id', asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id).lean();

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const [activities, scoring_history, competitors, documents] = await Promise.all([
    LeadActivity.find({ lead_id: req.params.id }).sort({ activity_date: -1 }).lean(),
    LeadScoringHistory.find({ lead_id: req.params.id }).sort({ created_at: -1 }).limit(10).lean(),
    CompetitorTracking.find({ opportunity_id: req.params.id }).lean(),
    OpportunityDocument.find({ opportunity_id: req.params.id }).sort({ created_at: -1 }).lean(),
  ]);

  res.json({
    ...lead,
    activities,
    scoring_history,
    competitors,
    documents,
  });
}));

// Create lead
router.post('/', asyncHandler(async (req, res) => {
  const {
    name, partner_id, email, phone, expected_revenue,
    probability, stage, user_id, priority, type,
  } = req.body;

  const lead = await Lead.create({
    name,
    partner_id,
    email,
    phone,
    expected_revenue: expected_revenue || 0,
    probability: probability || 0,
    stage: stage || 'new',
    user_id: user_id || undefined,
    priority: priority || 'medium',
    type: type || 'lead',
  });

  res.status(201).json(lead);
}));

// Update lead
router.put('/:id', asyncHandler(async (req, res) => {
  const {
    name, partner_id, email, phone,
    expected_revenue, probability, stage, priority,
  } = req.body;

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { name, partner_id, email, phone, expected_revenue, probability, stage, priority },
    { new: true }
  );

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json(lead);
}));

// Delete lead
router.delete('/:id', asyncHandler(async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  res.json({ message: 'Lead deleted successfully' });
}));

// Convert lead to opportunity
router.post('/:id/convert', asyncHandler(async (req, res) => {
  const { partner_id } = req.body;

  const lead = await Lead.findById(req.params.id).lean();
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const updateData: any = {
    type: 'opportunity',
    stage: 'qualified',
    converted_at: new Date(),
  };
  if (partner_id) updateData.partner_id = partner_id;

  const updated = await Lead.findByIdAndUpdate(req.params.id, updateData, { new: true });
  res.json(updated);
}));

// Add activity to lead
router.post('/:id/activities', asyncHandler(async (req, res) => {
  const { activity_type, subject, description, activity_date, duration_minutes, user_id } = req.body;

  const activity = await LeadActivity.create({
    lead_id: req.params.id,
    activity_type,
    subject,
    description,
    activity_date: activity_date || new Date(),
    duration_minutes,
    user_id,
  });

  res.status(201).json(activity);
}));

// Update lead score
router.post('/:id/score', asyncHandler(async (req, res) => {
  const { score, scoring_rule_id, reason } = req.body;

  await Lead.findByIdAndUpdate(req.params.id, { score });

  await LeadScoringHistory.create({
    lead_id: req.params.id,
    score,
    scoring_rule_id,
    reason,
  });

  const updated = await Lead.findById(req.params.id).lean();
  res.json(updated);
}));

// Add competitor tracking
router.post('/:id/competitors', asyncHandler(async (req, res) => {
  const { competitor_name, competitor_strength, competitor_weakness, our_competitive_advantage } = req.body;

  const competitor = await CompetitorTracking.create({
    opportunity_id: req.params.id,
    competitor_name,
    competitor_strength,
    competitor_weakness,
    our_competitive_advantage,
  });

  res.status(201).json(competitor);
}));

// Add document to opportunity
router.post('/:id/documents', asyncHandler(async (req, res) => {
  const { document_type, name, file_url, file_path, version, created_by } = req.body;

  const document = await OpportunityDocument.create({
    opportunity_id: req.params.id,
    document_type,
    name,
    file_url,
    file_path,
    version: version || 1,
    created_by,
  });

  res.status(201).json(document);
}));

export default router;
