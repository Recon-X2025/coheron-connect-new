import express from 'express';
import { Deal } from '../../../models/Deal.js';
import { Pipeline } from '../../../models/Pipeline.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all deals
router.get('/', asyncHandler(async (req, res) => {
  const { pipeline_id, stage_id, owner_id, forecast_category, is_won, is_lost, search } = req.query;
  const filter: any = {};

  if (pipeline_id) filter.pipeline_id = pipeline_id;
  if (stage_id) filter.stage_id = stage_id;
  if (owner_id) filter.owner_id = owner_id;
  if (forecast_category) filter.forecast_category = forecast_category;
  if (is_won !== undefined) filter.is_won = is_won === 'true';
  if (is_lost !== undefined) filter.is_lost = is_lost === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search as string, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Deal.find(filter)
      .populate('pipeline_id', 'name')
      .populate('partner_id', 'name email')
      .populate('owner_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    Deal
  );
  res.json(result);
}));

// Get deal by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.id)
    .populate('pipeline_id')
    .populate('partner_id', 'name email')
    .populate('owner_id', 'name')
    .populate('line_items.product_id', 'name default_code')
    .populate('contact_ids.contact_id', 'name email')
    .lean();

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json(deal);
}));

// Create deal
router.post('/', asyncHandler(async (req, res) => {
  const deal = await Deal.create(req.body);
  res.status(201).json(deal);
}));

// Update deal
router.put('/:id', asyncHandler(async (req, res) => {
  const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json(deal);
}));

// Delete deal
router.delete('/:id', asyncHandler(async (req, res) => {
  const deal = await Deal.findByIdAndDelete(req.params.id);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json({ message: 'Deal deleted successfully' });
}));

// Stage transition
router.post('/:id/stage', asyncHandler(async (req, res) => {
  const { stage_id, stage_name } = req.body;
  const deal = await Deal.findById(req.params.id);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  const now = new Date();
  const history: any = deal.toObject();

  // Close current stage in history
  if (history.stage_history && history.stage_history.length > 0) {
    const last = history.stage_history[history.stage_history.length - 1];
    if (!last.exited_at) {
      last.exited_at = now;
      last.duration_seconds = Math.floor((now.getTime() - new Date(last.entered_at).getTime()) / 1000);
    }
  }

  const stageHistory = history.stage_history || [];
  stageHistory.push({ stage: stage_name || stage_id, entered_at: now });

  const updated = await Deal.findByIdAndUpdate(req.params.id, {
    stage_id,
    stage_history: stageHistory,
    days_in_stage: 0,
  }, { new: true });

  res.json(updated);
}));

// Manage line items
router.post('/:id/line-items', asyncHandler(async (req, res) => {
  const deal = await Deal.findById(req.params.id);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  const item = req.body;
  item.total = (item.quantity || 1) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100) * (1 + (item.tax_percent || 0) / 100);

  const updated = await Deal.findByIdAndUpdate(
    req.params.id,
    { $push: { line_items: item } },
    { new: true }
  );
  res.json(updated);
}));

router.delete('/:id/line-items/:itemId', asyncHandler(async (req, res) => {
  const updated = await Deal.findByIdAndUpdate(
    req.params.id,
    { $pull: { line_items: { _id: req.params.itemId } } },
    { new: true }
  );
  if (!updated) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json(updated);
}));

export default router;
