import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { MarketplaceApp } from '../models/MarketplaceApp.js';
import { AppInstallation } from '../models/AppInstallation.js';

const router = express.Router();

// ── Browse Apps ────────────────────────────────────────────────────

router.get('/apps', asyncHandler(async (req, res) => {
  const { category, search, pricing_type, status = 'published', page = '1', limit = '20' } = req.query;
  const filter: any = { status };
  if (category) filter.category = category;
  if (pricing_type) filter.pricing_type = pricing_type;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const [apps, total] = await Promise.all([
    MarketplaceApp.find(filter).sort({ install_count: -1 }).skip(skip).limit(Number(limit)).lean(),
    MarketplaceApp.countDocuments(filter),
  ]);
  res.json({ apps, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

router.get('/apps/:id', asyncHandler(async (req, res) => {
  const app = await MarketplaceApp.findById(req.params.id).lean();
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
}));

router.get('/apps/:slug/by-slug', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const app = await MarketplaceApp.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
}));

router.post('/apps', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const app = await MarketplaceApp.create({ ...req.body, tenant_id });
  res.status(201).json(app);
}));

router.put('/apps/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const app = await MarketplaceApp.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true },
  ).lean();
  if (!app) return res.status(404).json({ error: 'App not found' });
  res.json(app);
}));

// ── Install / Uninstall ────────────────────────────────────────────

router.post('/install/:appId', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const installed_by = (req as any).user?._id;
  const app = await MarketplaceApp.findById(req.params.appId).lean();
  if (!app) return res.status(404).json({ error: 'App not found' });

  const existing = await AppInstallation.findOne({ tenant_id, app_id: req.params.appId });
  if (existing && existing.status === 'active') return res.status(400).json({ error: 'App already installed' });

  if (existing) {
    existing.status = 'active';
    existing.installed_at = new Date();
    existing.installed_by = installed_by;
    existing.version_installed = app.version;
    existing.uninstalled_at = undefined;
    await existing.save();
    await MarketplaceApp.findByIdAndUpdate(req.params.appId, { $inc: { install_count: 1 } });
    return res.json(existing);
  }

  const installation = await AppInstallation.create({
    tenant_id, app_id: req.params.appId, installed_by, version_installed: app.version, config: req.body.config || {},
  });
  await MarketplaceApp.findByIdAndUpdate(req.params.appId, { $inc: { install_count: 1 } });
  res.status(201).json(installation);
}));

router.delete('/uninstall/:appId', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const installation = await AppInstallation.findOneAndUpdate(
    { tenant_id, app_id: req.params.appId, status: 'active' },
    { $set: { status: 'uninstalled', uninstalled_at: new Date() } },
    { new: true },
  ).lean();
  if (!installation) return res.status(404).json({ error: 'Installation not found' });
  res.json({ success: true });
}));

router.get('/installed', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const installations = await AppInstallation.find({ tenant_id, status: 'active' })
    .populate('app_id').populate('installed_by', 'name email').lean();
  res.json(installations);
}));

router.put('/installations/:id/config', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const installation = await AppInstallation.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: { config: req.body.config } },
    { new: true },
  ).lean();
  if (!installation) return res.status(404).json({ error: 'Installation not found' });
  res.json(installation);
}));

// ── Categories & Featured ──────────────────────────────────────────

router.get('/categories', asyncHandler(async (_req, res) => {
  const result = await MarketplaceApp.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json(result.map(r => ({ category: r._id, count: r.count })));
}));

router.get('/featured', asyncHandler(async (_req, res) => {
  const apps = await MarketplaceApp.find({ status: 'published', is_verified: true })
    .sort({ rating: -1, install_count: -1 }).limit(10).lean();
  res.json(apps);
}));

export default router;
