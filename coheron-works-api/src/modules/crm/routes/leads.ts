import express from 'express';
import { Lead, LeadActivity, LeadScoringHistory, CompetitorTracking, OpportunityDocument } from '../../../models/Lead.js';
import { Deal } from '../../../models/Deal.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

/**
 * @swagger
 * /leads:
 *   get:
 *     tags: [CRM]
 *     summary: List leads with pagination and filters
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [lead, opportunity] }
 *       - in: query
 *         name: stage
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Paginated list of leads
 */
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

/**
 * @swagger
 * /leads:
 *   post:
 *     tags: [CRM]
 *     summary: Create a new lead
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               expected_revenue: { type: number }
 *               probability: { type: number }
 *               stage: { type: string }
 *               type: { type: string, enum: [lead, opportunity] }
 *     responses:
 *       201:
 *         description: Lead created
 */
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

// Convert lead to opportunity and create a Deal
router.post('/:id/convert', asyncHandler(async (req, res) => {
  const { partner_id, pipeline_id, stage_id, deal_name, owner_id, tenant_id } = req.body;

  const lead = await Lead.findById(req.params.id).lean() as any;
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const now = new Date();
  const updateData: any = {
    type: 'opportunity',
    stage: 'qualified',
    converted_at: now,
  };
  if (partner_id) updateData.partner_id = partner_id;

  const updated = await Lead.findByIdAndUpdate(req.params.id, updateData, { new: true });

  // Create a Deal from the lead
  const dealData: any = {
    name: deal_name || lead.name,
    pipeline_id,
    stage_id,
    value: lead.expected_revenue || 0,
    probability: lead.probability || 0,
    partner_id: partner_id || lead.partner_id,
    owner_id: owner_id || lead.user_id,
    tenant_id: tenant_id || lead.tenant_id,
  };

  let deal = null;
  if (pipeline_id) {
    deal = await Deal.create(dealData);
  }

  res.json({ lead: updated, deal });
}));

// Add activity to lead and update engagement counters
router.post('/:id/activities', asyncHandler(async (req, res) => {
  const { activity_type, subject, description, activity_date, duration_minutes, user_id } = req.body;

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const activity = await LeadActivity.create({
    lead_id: req.params.id,
    activity_type,
    subject,
    description,
    activity_date: activity_date || new Date(),
    duration_minutes,
    user_id,
  });

  // Update engagement counters on the lead
  await Lead.findByIdAndUpdate(req.params.id, {
    $inc: { activity_count: 1 },
    last_activity_at: new Date(),
    last_activity_type: activity_type,
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

// Bulk assign leads to an owner
router.post('/bulk-assign', asyncHandler(async (req, res) => {
  const { lead_ids, user_id } = req.body;

  if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
    return res.status(400).json({ error: 'lead_ids must be a non-empty array' });
  }
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const result = await Lead.updateMany(
    { _id: { $in: lead_ids } },
    { user_id, assigned_at: new Date() }
  );

  res.json({ matched: result.matchedCount, modified: result.modifiedCount });
}));

// Analytics: funnel metrics, source breakdown, conversion rates
router.get('/analytics', asyncHandler(async (req, res) => {
  const { tenant_id, date_from, date_to } = req.query;
  const match: any = {};
  if (tenant_id) match.tenant_id = tenant_id;
  if (date_from || date_to) {
    match.created_at = {};
    if (date_from) match.created_at.$gte = new Date(date_from as string);
    if (date_to) match.created_at.$lte = new Date(date_to as string);
  }

  const [funnelMetrics, sourceBreakdown, conversionStats] = await Promise.all([
    // Funnel: count by stage
    Lead.aggregate([
      { $match: match },
      { $group: { _id: '$stage', count: { $sum: 1 }, total_revenue: { $sum: '$expected_revenue' } } },
      { $sort: { count: -1 } },
    ]),
    // Source breakdown
    Lead.aggregate([
      { $match: match },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Conversion rates
    Lead.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ['$type', 'opportunity'] }, 1, 0] } },
          avg_score: { $avg: '$score' },
          total_revenue: { $sum: '$expected_revenue' },
        },
      },
    ]),
  ]);

  const conversion = conversionStats[0] || { total: 0, converted: 0, avg_score: 0, total_revenue: 0 };

  res.json({
    funnel: funnelMetrics,
    sources: sourceBreakdown,
    conversion: {
      total_leads: conversion.total,
      converted: conversion.converted,
      conversion_rate: conversion.total > 0 ? ((conversion.converted / conversion.total) * 100).toFixed(2) : '0.00',
      avg_score: conversion.avg_score ? conversion.avg_score.toFixed(2) : '0.00',
      total_pipeline_revenue: conversion.total_revenue,
    },
  });
}));

export default router;
