import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { offlineSyncService } from '../../../services/OfflineSyncService.js';

const router = Router();

// GET /offline-sync/manifest
router.get('/manifest', asyncHandler(async (_req, res) => {
  res.json(offlineSyncService.getManifest());
}));

// POST /offline-sync/pull
router.post('/pull', asyncHandler(async (req, res) => {
  const { collections, since } = req.body;
  const tenantId = (req as any).tenantId || req.body.tenant_id;

  if (!collections || !Array.isArray(collections)) {
    return res.status(400).json({ error: 'collections array is required' });
  }

  const sinceDate = since ? new Date(since) : new Date(0);
  const result = await offlineSyncService.pullChanges(collections, sinceDate, { tenant_id: tenantId });
  res.json(result);
}));

// POST /offline-sync/push
router.post('/push', asyncHandler(async (req, res) => {
  const { operations } = req.body;
  const tenantId = (req as any).tenantId || req.body.tenant_id;

  if (!operations || !Array.isArray(operations)) {
    return res.status(400).json({ error: 'operations array is required' });
  }

  const result = await offlineSyncService.pushChanges(operations, tenantId);
  res.json(result);
}));

// GET /offline-sync/sw-config
router.get('/sw-config', asyncHandler(async (_req, res) => {
  res.json(offlineSyncService.getServiceWorkerConfig());
}));

export default router;
