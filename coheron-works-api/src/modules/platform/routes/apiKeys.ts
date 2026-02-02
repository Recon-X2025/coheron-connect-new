import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import APIKey from '../../../models/APIKey.js';
import { generateApiKey } from '../../../middleware/apiKeyAuth.js';
import mongoose from 'mongoose';

const router = Router();

// GET / - list API keys
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const keys = await APIKey.find({ tenant_id: tenantId }).select('-key_hash').sort({ created_at: -1 }).lean();
  res.json(keys);
}));

// POST / - generate new key
router.post('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const userId = (req as any).userId;
  const { name, scopes, rate_limit_per_minute, expires_at } = req.body;

  if (!name) return res.status(400).json({ error: 'name is required' });

  const { key, hash, prefix } = generateApiKey();

  const apiKey = await APIKey.create({
    tenant_id: new mongoose.Types.ObjectId(tenantId),
    name,
    key_hash: hash,
    prefix,
    scopes: scopes || ['read'],
    rate_limit_per_minute: rate_limit_per_minute || 60,
    expires_at: expires_at ? new Date(expires_at) : null,
    created_by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
  });

  // Return the full key ONLY on creation
  res.status(201).json({ ...apiKey.toObject(), key, key_hash: undefined });
}));

// DELETE /:id - revoke key
router.delete('/:id', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  await APIKey.updateOne({ _id: req.params.id, tenant_id: tenantId }, { is_active: false });
  res.json({ success: true });
}));

// GET /:id/usage - usage stats
router.get('/:id/usage', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const key = await APIKey.findOne({ _id: req.params.id, tenant_id: tenantId }).select('name prefix usage_count last_used_at rate_limit_per_minute').lean();
  if (!key) return res.status(404).json({ error: 'Key not found' });
  res.json(key);
}));

export default router;
