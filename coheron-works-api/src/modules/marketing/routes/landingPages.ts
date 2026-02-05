import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { LandingPage } from '../../../models/LandingPage.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// List landing pages
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { is_published, campaign_id } = req.query;
  const filter: any = {};
  if (is_published !== undefined) filter.is_published = is_published === 'true';
  if (campaign_id) filter.campaign_id = campaign_id;
  const params = getPaginationParams(req);
  const result = await paginateQuery(LandingPage.find(filter).sort({ created_at: -1 }).lean(), params, filter, LandingPage);
  res.json(result);
}));

// Create landing page
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const page = new LandingPage({ ...req.body, created_by: (req as any).user?.id });
  await page.save();
  res.status(201).json(page);
}));

// Get landing page detail
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const page = await LandingPage.findById(req.params.id).lean();
  if (!page) return res.status(404).json({ message: 'Landing page not found' });
  res.json(page);
}));

// Update landing page
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const page = await LandingPage.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!page) return res.status(404).json({ message: 'Landing page not found' });
  res.json(page);
}));

// Publish landing page
router.post('/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const page = await LandingPage.findByIdAndUpdate(req.params.id, { is_published: true }, { new: true });
  if (!page) return res.status(404).json({ message: 'Landing page not found' });
  res.json(page);
}));

// Unpublish landing page
router.post('/:id/unpublish', authenticate, asyncHandler(async (req, res) => {
  const page = await LandingPage.findByIdAndUpdate(req.params.id, { is_published: false }, { new: true });
  if (!page) return res.status(404).json({ message: 'Landing page not found' });
  res.json(page);
}));

// Page analytics
router.get('/:id/analytics', authenticate, asyncHandler(async (req, res) => {
  const page = await LandingPage.findById(req.params.id).select('name slug visits submissions conversion_rate is_published').lean();
  if (!page) return res.status(404).json({ message: 'Landing page not found' });
  res.json(page);
}));

// Public form submission (no auth required)
router.post('/public/:slug/submit', asyncHandler(async (req, res) => {
  const page = await LandingPage.findOne({ slug: req.params.slug, is_published: true });
  if (!page) return res.status(404).json({ message: 'Page not found' });
  const p = page as any;
  p.submissions = (p.submissions || 0) + 1;
  p.conversion_rate = p.visits > 0 ? (p.submissions / p.visits) * 100 : 0;
  await page.save();
  const response = p.redirect_url ? { redirect: p.redirect_url } : { message: p.thank_you_message || 'Thank you for your submission!' };
  res.json(response);
}));

export default router;
