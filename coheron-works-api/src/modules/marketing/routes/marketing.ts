import express from 'express';
import { MarketingWorkflow } from '../../../models/MarketingWorkflow.js';
import { CampaignPerformance, CampaignFinancial } from '../../../models/Campaign.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Marketing Workflows
router.get('/workflows', asyncHandler(async (req, res) => {
  const { campaign_id } = req.query;
  const filter: any = {};

  if (campaign_id) filter.campaign_id = campaign_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    MarketingWorkflow.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    MarketingWorkflow
  );
  res.json(result);
}));

router.post('/workflows', asyncHandler(async (req, res) => {
  const { name, campaign_id, trigger_type, trigger_conditions, steps, is_active } = req.body;

  const workflow = await MarketingWorkflow.create({
    name,
    campaign_id,
    trigger_type,
    trigger_conditions: trigger_conditions || {},
    steps: steps || [],
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json(workflow);
}));

router.put('/workflows/:id', asyncHandler(async (req, res) => {
  const { name, trigger_type, trigger_conditions, steps, is_active } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
  if (trigger_conditions !== undefined) updateData.trigger_conditions = trigger_conditions;
  if (steps !== undefined) updateData.steps = steps;
  if (is_active !== undefined) updateData.is_active = is_active;

  const workflow = await MarketingWorkflow.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json(workflow);
}));

// Campaign Performance
router.get('/campaigns/:id/performance', asyncHandler(async (req, res) => {
  const performance = await CampaignPerformance.find({ campaign_id: req.params.id }).sort({ date: -1 }).lean();
  res.json(performance);
}));

// Campaign Financials
router.get('/campaigns/:id/financials', asyncHandler(async (req, res) => {
  const financials = await CampaignFinancial.find({ campaign_id: req.params.id }).sort({ transaction_date: -1 }).lean();
  res.json(financials);
}));

export default router;
