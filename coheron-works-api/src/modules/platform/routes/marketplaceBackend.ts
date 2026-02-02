import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import MarketplaceApp from '../../../models/MarketplaceApp.js';
import AppInstallation from '../../../models/AppInstallation.js';
import mongoose from 'mongoose';

const router = Router();

// GET /apps - browse apps
router.get('/apps', asyncHandler(async (req, res) => {
  const { category, search, limit } = req.query;
  const filter: any = { status: 'published' };
  if (category) filter.category = category;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } },
  ];

  const apps = await MarketplaceApp.find(filter).sort({ install_count: -1 }).limit(parseInt(limit as string) || 50).lean();
  res.json({ apps });
}));

// GET /categories
router.get('/categories', asyncHandler(async (_req, res) => {
  const categories = await MarketplaceApp.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  res.json(categories.map(c => ({ category: c._id, count: c.count })));
}));

// GET /featured
router.get('/featured', asyncHandler(async (_req, res) => {
  const apps = await MarketplaceApp.find({ status: 'published', is_featured: true }).limit(10).lean();
  res.json(apps);
}));

// GET /installed - list installed apps for tenant
router.get('/installed', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const installations = await AppInstallation.find({ tenant_id: tenantId, is_active: true }).populate('app_id').lean();
  res.json(installations);
}));

// POST /install/:appId
router.post('/install/:appId', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const userId = (req as any).userId;
  const appId = req.params.appId;

  const app = await MarketplaceApp.findById(appId);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const existing = await AppInstallation.findOne({ tenant_id: tenantId, app_id: appId });
  if (existing?.is_active) return res.status(400).json({ error: 'App already installed' });

  const installation = existing
    ? await AppInstallation.findByIdAndUpdate(existing._id, { is_active: true, installed_at: new Date(), version_installed: app.version }, { new: true })
    : await AppInstallation.create({
        tenant_id: new mongoose.Types.ObjectId(tenantId),
        app_id: new mongoose.Types.ObjectId(appId),
        installed_by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        version_installed: app.version,
        config: req.body.config || {},
      });

  await MarketplaceApp.updateOne({ _id: appId }, { $inc: { install_count: 1 } });
  res.status(201).json(installation);
}));

// DELETE /uninstall/:appId
router.delete('/uninstall/:appId', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  await AppInstallation.updateOne({ tenant_id: tenantId, app_id: req.params.appId }, { is_active: false });
  res.json({ success: true });
}));

// PUT /config/:appId - update app config
router.put('/config/:appId', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const installation = await AppInstallation.findOneAndUpdate(
    { tenant_id: tenantId, app_id: req.params.appId, is_active: true },
    { $set: { config: req.body.config } },
    { new: true }
  );
  if (!installation) return res.status(404).json({ error: 'App not installed' });
  res.json(installation);
}));

export default router;
