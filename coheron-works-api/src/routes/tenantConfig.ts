import express from 'express';
import { TenantConfig } from '../models/TenantConfig.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

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
  res.json(config);
}));

export default router;
