import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { ExtensionManifest } from '../../../models/ExtensionManifest.js';
import { CustomEntity } from '../../../models/CustomEntity.js';

const router = express.Router();

router.get('/', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const extensions = await ExtensionManifest.find({ tenant_id }).sort({ created_at: -1 });
  res.json({ data: extensions });
}));

router.get('/installed', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const extensions = await ExtensionManifest.find({ tenant_id, is_installed: true }).sort({ installed_at: -1 });
  res.json({ data: extensions });
}));

router.post('/install', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const { slug, name, description, author, category, version, models, routes, hooks, settings_schema, icon_url, homepage_url } = req.body;
  const existing = await ExtensionManifest.findOne({ tenant_id, slug });
  if (existing?.is_installed) return res.status(409).json({ error: 'Extension already installed' });
  const manifest = existing
    ? await ExtensionManifest.findOneAndUpdate(
        { tenant_id, slug },
        { $set: { is_installed: true, is_active: true, installed_at: new Date(), name, description, author, category, version, models, routes, hooks, settings_schema, icon_url, homepage_url } },
        { new: true }
      )
    : await ExtensionManifest.create({
        tenant_id, slug, name, description, author, category, version,
        models: models || [], routes: routes || [], hooks: hooks || [],
        settings_schema: settings_schema || {}, settings_values: {},
        icon_url, homepage_url,
        is_installed: true, is_active: true, installed_at: new Date()
      });
  if (models && Array.isArray(models)) {
    for (const modelSlug of models) {
      const entityDef = req.body.model_definitions?.[modelSlug];
      if (entityDef) {
        await CustomEntity.findOneAndUpdate(
          { tenant_id, slug: modelSlug },
          { $set: { ...entityDef, tenant_id, slug: modelSlug } },
          { upsert: true, new: true }
        );
      }
    }
  }
  res.status(201).json({ data: manifest });
}));

router.post('/:slug/activate', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const ext = await ExtensionManifest.findOneAndUpdate(
    { tenant_id, slug: req.params.slug, is_installed: true },
    { $set: { is_active: true } },
    { new: true }
  );
  if (!ext) return res.status(404).json({ error: 'Extension not found or not installed' });
  res.json({ data: ext });
}));

router.post('/:slug/deactivate', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const ext = await ExtensionManifest.findOneAndUpdate(
    { tenant_id, slug: req.params.slug, is_installed: true },
    { $set: { is_active: false } },
    { new: true }
  );
  if (!ext) return res.status(404).json({ error: 'Extension not found or not installed' });
  res.json({ data: ext });
}));

router.delete('/:slug', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const ext = await ExtensionManifest.findOne({ tenant_id, slug: req.params.slug });
  if (!ext) return res.status(404).json({ error: 'Extension not found' });
  if (req.query.remove_data === 'true' && ext.models && ext.models.length > 0) {
    for (const modelSlug of ext.models) {
      await CustomEntity.findOneAndDelete({ tenant_id, slug: modelSlug });
    }
  }
  ext.is_installed = false;
  ext.is_active = false;
  await ext.save();
  res.json({ message: 'Extension uninstalled' });
}));

router.get('/:slug/settings', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const ext = await ExtensionManifest.findOne({ tenant_id, slug: req.params.slug });
  if (!ext) return res.status(404).json({ error: 'Extension not found' });
  res.json({ data: { schema: ext.settings_schema, values: ext.settings_values } });
}));

router.put('/:slug/settings', asyncHandler(async (req: any, res) => {
  const tenant_id = req.user?.tenant_id;
  const ext = await ExtensionManifest.findOneAndUpdate(
    { tenant_id, slug: req.params.slug },
    { $set: { settings_values: req.body } },
    { new: true }
  );
  if (!ext) return res.status(404).json({ error: 'Extension not found' });
  res.json({ data: { schema: ext.settings_schema, values: ext.settings_values } });
}));

export default router;
