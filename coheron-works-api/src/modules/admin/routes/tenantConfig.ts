import express from 'express';
import { TenantConfig } from '../../../shared/models/TenantConfig.js';
import { PricingPlan } from '../../../models/PricingPlan.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { clearModuleCache } from '../../../shared/middleware/moduleGuard.js';

const router = express.Router();

const AVAILABLE_MODULES = [
  'crm',
  'sales',
  'support',
  'hr',
  'manufacturing',
  'inventory',
  'accounting',
  'marketing',
  'projects',
  'pos',
  'website',
  'esignature',
  'platform',
  'ai',
];

// GET /tenant-config/modules/available — static list of all module names
router.get('/modules/available', asyncHandler(async (_req, res) => {
  res.json({ modules: AVAILABLE_MODULES });
}));

// GET /tenant-config/:tenantId — get tenant config
router.get('/:tenantId', asyncHandler(async (req, res) => {
  const config = await TenantConfig.findOne({ tenant_id: req.params.tenantId });
  if (!config) {
    return res.status(404).json({ error: 'Tenant config not found' });
  }
  res.json(config);
}));

// PUT /tenant-config/:tenantId/modules — set enabled_modules array
router.put('/:tenantId/modules', asyncHandler(async (req, res) => {
  const { enabled_modules } = req.body;
  if (!Array.isArray(enabled_modules)) {
    return res.status(400).json({ error: 'enabled_modules must be an array' });
  }

  const invalid = enabled_modules.filter((m: string) => !AVAILABLE_MODULES.includes(m));
  if (invalid.length > 0) {
    return res.status(400).json({ error: 'Invalid module names', invalid });
  }

  const config = await TenantConfig.findOneAndUpdate(
    { tenant_id: req.params.tenantId },
    { enabled_modules },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  clearModuleCache(req.params.tenantId);

  // Emit socket event for hot-toggle
  const io = req.app.get('io');
  if (io) {
    io.to(`tenant:${req.params.tenantId}`).emit('module:toggled', {
      enabled_modules: config.enabled_modules,
    });
  }

  res.json(config);
}));

// POST /tenant-config/modules/enable — enable specific modules
router.post('/modules/enable', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }

  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array' });
  }

  const invalid = modules.filter((m: string) => !AVAILABLE_MODULES.includes(m));
  if (invalid.length > 0) {
    return res.status(400).json({ error: 'Invalid module names', invalid });
  }

  const config = await TenantConfig.findOneAndUpdate(
    { tenant_id: tenantId },
    { $addToSet: { enabled_modules: { $each: modules } } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  clearModuleCache(tenantId.toString());

  const io = req.app.get('io');
  if (io) {
    io.to(`tenant:${tenantId}`).emit('module:toggled', {
      enabled_modules: config.enabled_modules,
    });
  }

  res.json(config);
}));

// POST /tenant-config/modules/disable — disable specific modules
router.post('/modules/disable', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }

  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array' });
  }

  const config = await TenantConfig.findOneAndUpdate(
    { tenant_id: tenantId },
    { $pullAll: { enabled_modules: modules } },
    { new: true }
  );

  if (!config) {
    return res.status(404).json({ error: 'Tenant config not found' });
  }

  clearModuleCache(tenantId.toString());

  const io = req.app.get('io');
  if (io) {
    io.to(`tenant:${tenantId}`).emit('module:toggled', {
      enabled_modules: config.enabled_modules,
    });
  }

  res.json(config);
}));

// POST /tenant-config/subscribe-plan — apply a plan's modules to tenant
router.post('/subscribe-plan', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }

  const { plan_slug } = req.body;
  if (!plan_slug) {
    return res.status(400).json({ error: 'plan_slug is required' });
  }

  const plan = await PricingPlan.findOne({ slug: plan_slug, is_active: true });
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const config = await TenantConfig.findOneAndUpdate(
    { tenant_id: tenantId },
    { enabled_modules: plan.included_modules },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  clearModuleCache(tenantId.toString());

  const io = req.app.get('io');
  if (io) {
    io.to(`tenant:${tenantId}`).emit('module:toggled', {
      enabled_modules: config.enabled_modules,
    });
  }

  res.json({ config, plan: { name: plan.name, slug: plan.slug } });
}));

// POST /tenant-config/add-modules — à la carte add individual modules
router.post('/add-modules', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }

  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array' });
  }

  const invalid = modules.filter((m: string) => !AVAILABLE_MODULES.includes(m));
  if (invalid.length > 0) {
    return res.status(400).json({ error: 'Invalid module names', invalid });
  }

  const config = await TenantConfig.findOneAndUpdate(
    { tenant_id: tenantId },
    { $addToSet: { enabled_modules: { $each: modules } } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  clearModuleCache(tenantId.toString());

  const io = req.app.get('io');
  if (io) {
    io.to(`tenant:${tenantId}`).emit('module:toggled', {
      enabled_modules: config.enabled_modules,
    });
  }

  res.json(config);
}));

// POST /tenant-config/remove-modules — remove individual modules
router.post('/remove-modules', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }

  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array' });
  }

  const config = await TenantConfig.findOneAndUpdate(
    { tenant_id: tenantId },
    { $pullAll: { enabled_modules: modules } },
    { new: true }
  );

  if (!config) {
    return res.status(404).json({ error: 'Tenant config not found' });
  }

  clearModuleCache(tenantId.toString());

  const io = req.app.get('io');
  if (io) {
    io.to(`tenant:${tenantId}`).emit('module:toggled', {
      enabled_modules: config.enabled_modules,
    });
  }

  res.json(config);
}));

export default router;
