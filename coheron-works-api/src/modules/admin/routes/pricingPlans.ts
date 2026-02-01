import express from 'express';
import { PricingPlan } from '../../../models/PricingPlan.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET /pricing-plans — list all active plans (public)
router.get('/', asyncHandler(async (_req, res) => {
  const plans = await PricingPlan.find({ is_active: true }).sort({ display_order: 1 });
  res.json(plans);
}));

// GET /pricing-plans/by-type/:type — filter by plan type
router.get('/by-type/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!['tier', 'industry', 'addon'].includes(type)) {
    return res.status(400).json({ error: 'Invalid plan type' });
  }
  const plans = await PricingPlan.find({ plan_type: type, is_active: true }).sort({ display_order: 1 });
  res.json(plans);
}));

// GET /pricing-plans/:slug — get plan by slug
router.get('/:slug', asyncHandler(async (req, res) => {
  const plan = await PricingPlan.findOne({ slug: req.params.slug });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

// POST /pricing-plans — admin create
router.post('/', asyncHandler(async (req, res) => {
  const plan = await PricingPlan.create(req.body);
  res.status(201).json(plan);
}));

// PUT /pricing-plans/:id — admin update
router.put('/:id', asyncHandler(async (req, res) => {
  const plan = await PricingPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json(plan);
}));

// DELETE /pricing-plans/:id — admin delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const plan = await PricingPlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  res.json({ message: 'Plan deleted' });
}));

export default router;
