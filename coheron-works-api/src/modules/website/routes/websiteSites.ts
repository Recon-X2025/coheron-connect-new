import express from 'express';
import { WebsiteSite } from '../../../models/WebsiteSite.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all sites
router.get('/', asyncHandler(async (req, res) => {
  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WebsiteSite.find().sort({ is_default: -1, created_at: -1 }).lean(),
    pagination, {}, WebsiteSite
  );

  res.json(paginatedResult);
}));

// Get site by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const site = await WebsiteSite.findById(req.params.id).lean();
  if (!site) {
    return res.status(404).json({ error: 'Site not found' });
  }
  res.json(site);
}));

// Create site
router.post('/', asyncHandler(async (req, res) => {
  const { name, domain, subdomain, locale, theme, settings, is_active, is_default } = req.body;

  if (is_default) {
    await WebsiteSite.updateMany({}, { is_default: false });
  }

  const site = await WebsiteSite.create({
    name,
    domain,
    subdomain,
    locale: locale || 'en_US',
    theme: theme || 'default',
    settings: settings || '{}',
    is_active: is_active !== false,
    is_default: is_default || false,
  });

  res.status(201).json(site);
}));

// Update site
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, domain, subdomain, locale, theme, settings, is_active, is_default } = req.body;

  if (is_default) {
    await WebsiteSite.updateMany({ _id: { $ne: req.params.id } }, { is_default: false });
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (domain !== undefined) updateData.domain = domain;
  if (subdomain !== undefined) updateData.subdomain = subdomain;
  if (locale !== undefined) updateData.locale = locale;
  if (theme !== undefined) updateData.theme = theme;
  if (settings !== undefined) updateData.settings = settings;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (is_default !== undefined) updateData.is_default = is_default;

  const result = await WebsiteSite.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Site not found' });
  }

  res.json(result);
}));

// Delete site
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await WebsiteSite.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Site not found' });
  }
  res.json({ message: 'Site deleted successfully' });
}));

export default router;
