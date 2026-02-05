import express from 'express';
import { Campaign, CampaignPerformance, CampaignFinancial } from '../../../models/Campaign.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all campaigns
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { campaign_type, state, search } = req.query;
  const filter: any = {};

  if (campaign_type) filter.campaign_type = campaign_type;
  if (state) filter.state = state;
  if (search) {
    filter.name = { $regex: search as string, $options: 'i' };
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Campaign.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Campaign
  );
  res.json(result);
}));

// Get campaign by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id).lean();

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  res.json(campaign);
}));

// Create campaign
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    name, campaign_type, objective, state, start_date, end_date,
    budget, budget_limit, expected_revenue, target_kpis,
    audience_segment_id, description, user_id,
  } = req.body;

  const campaign = await Campaign.create({
    name,
    campaign_type: campaign_type || 'email',
    objective,
    state: state || 'draft',
    start_date,
    end_date,
    budget: budget || 0,
    budget_limit: budget_limit || 0,
    expected_revenue: expected_revenue || 0,
    target_kpis: target_kpis || null,
    audience_segment_id: audience_segment_id || null,
    description: description || null,
    user_id: user_id || undefined,
  });

  res.status(201).json(campaign);
}));

// Update campaign
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const {
    name, campaign_type, objective, state, start_date, end_date,
    budget, budget_limit, revenue, expected_revenue, total_cost,
    clicks, impressions, leads_count, target_kpis, audience_segment_id, description,
  } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (campaign_type !== undefined) updateData.campaign_type = campaign_type;
  if (objective !== undefined) updateData.objective = objective;
  if (state !== undefined) updateData.state = state;
  if (start_date !== undefined) updateData.start_date = start_date;
  if (end_date !== undefined) updateData.end_date = end_date;
  if (budget !== undefined) updateData.budget = budget;
  if (budget_limit !== undefined) updateData.budget_limit = budget_limit;
  if (revenue !== undefined) updateData.revenue = revenue;
  if (expected_revenue !== undefined) updateData.expected_revenue = expected_revenue;
  if (total_cost !== undefined) updateData.total_cost = total_cost;
  if (clicks !== undefined) updateData.clicks = clicks;
  if (impressions !== undefined) updateData.impressions = impressions;
  if (leads_count !== undefined) updateData.leads_count = leads_count;
  if (target_kpis !== undefined) updateData.target_kpis = target_kpis;
  if (audience_segment_id !== undefined) updateData.audience_segment_id = audience_segment_id;
  if (description !== undefined) updateData.description = description;

  const campaign = await Campaign.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  res.json(campaign);
}));

// Delete campaign
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  res.json({ message: 'Campaign deleted successfully' });
}));

// Get campaign performance data
router.get('/:id/performance', authenticate, asyncHandler(async (req, res) => {
  const performance = await CampaignPerformance.find({ campaign_id: req.params.id }).sort({ date: -1 }).lean();
  res.json(performance);
}));

// Get campaign financials
router.get('/:id/financials', authenticate, asyncHandler(async (req, res) => {
  const financials = await CampaignFinancial.find({ campaign_id: req.params.id }).sort({ transaction_date: -1 }).lean();
  res.json(financials);
}));

export default router;
