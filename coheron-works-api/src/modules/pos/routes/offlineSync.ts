import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { OfflineSyncQueue } from '../models/OfflineSyncQueue.js';

const router = express.Router();

// Bulk sync offline operations
router.post('/sync', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { operations } = req.body; // array of {store_id, terminal_id, operation_type, payload, created_offline_at}
  if (!Array.isArray(operations) || !operations.length) {
    return res.status(400).json({ error: 'operations array required' });
  }

  const results = [];
  for (const op of operations) {
    try {
      const item = await OfflineSyncQueue.create({
        tenant_id,
        store_id: op.store_id,
        terminal_id: op.terminal_id,
        operation_type: op.operation_type,
        payload: op.payload,
        created_offline_at: op.created_offline_at || new Date(),
        status: 'syncing',
      });
      // Process the operation (in production, actually apply the operation)
      item.status = 'synced';
      item.synced_at = new Date();
      await item.save();
      results.push({ id: item._id, status: 'synced' });
    } catch (err: any) {
      results.push({ operation_type: op.operation_type, status: 'failed', error: err.message });
    }
  }
  res.json({ synced: results.filter(r => r.status === 'synced').length, failed: results.filter(r => r.status === 'failed').length, results });
}));

// Pending sync items for a terminal
router.get('/pending/:terminalId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const items = await OfflineSyncQueue.find({
    tenant_id,
    terminal_id: req.params.terminalId,
    status: { $in: ['pending', 'conflict', 'failed'] },
  }).sort({ created_offline_at: 1 });
  res.json(items);
}));

// Resolve conflict
router.post('/resolve-conflict/:id', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { resolution } = req.body; // 'keep_local' | 'keep_server' | 'merge'
  const item = await OfflineSyncQueue.findOne({ _id: req.params.id, tenant_id, status: 'conflict' });
  if (!item) return res.status(404).json({ error: 'Conflict item not found' });

  item.conflict_resolution = resolution;
  item.status = 'synced';
  item.synced_at = new Date();
  await item.save();
  res.json(item);
}));

// Sync status for a store
router.get('/sync-status/:storeId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const storeId = req.params.storeId;
  const [pending, conflicts, failed, lastSynced] = await Promise.all([
    OfflineSyncQueue.countDocuments({ tenant_id, store_id: storeId, status: 'pending' }),
    OfflineSyncQueue.countDocuments({ tenant_id, store_id: storeId, status: 'conflict' }),
    OfflineSyncQueue.countDocuments({ tenant_id, store_id: storeId, status: 'failed' }),
    OfflineSyncQueue.findOne({ tenant_id, store_id: storeId, status: 'synced' }).sort({ synced_at: -1 }).select('synced_at terminal_id'),
  ]);
  res.json({ store_id: storeId, pending, conflicts, failed, last_synced: lastSynced?.synced_at, last_terminal: lastSynced?.terminal_id });
}));

// Download snapshot for offline use
router.post('/snapshot', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  // In production, gather catalog, prices, customers, tax rates
  res.json({
    tenant_id,
    generated_at: new Date(),
    catalog: [],
    customers: [],
    tax_rates: [],
    discounts: [],
    message: 'Snapshot generated. Sync this to your terminal for offline use.',
  });
}));

export default router;
