import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { ECommerceChannel } from '../models/ECommerceChannel.js';
import { ECommerceSyncLog } from '../models/ECommerceSyncLog.js';

const router = express.Router();

// List all channels
router.get('/channels', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const channels = await ECommerceChannel.find({ tenant_id: tenantId }).sort({ created_at: -1 }).lean();
  res.json(channels);
}));

// Get channel by ID
router.get('/channels/:id', asyncHandler(async (req, res) => {
  const channel = await ECommerceChannel.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json(channel);
}));

// Create channel
router.post('/channels', asyncHandler(async (req, res) => {
  const { channel_name, platform, api_key, api_secret, store_url, webhook_secret, sync_products, sync_orders, sync_inventory, settings } = req.body;

  const channel = await ECommerceChannel.create({
    tenant_id: req.user?.tenant_id,
    channel_name,
    platform,
    api_key,
    api_secret,
    store_url,
    webhook_secret,
    sync_products: sync_products !== false,
    sync_orders: sync_orders !== false,
    sync_inventory: sync_inventory !== false,
    settings: settings || {},
    status: 'pending',
  });

  res.status(201).json(channel);
}));

// Update channel
router.put('/channels/:id', asyncHandler(async (req, res) => {
  const channel = await ECommerceChannel.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true },
  );
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json(channel);
}));

// Delete channel
router.delete('/channels/:id', asyncHandler(async (req, res) => {
  const channel = await ECommerceChannel.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json({ message: 'Channel deleted successfully' });
}));

// Trigger sync
router.post('/channels/:id/sync', asyncHandler(async (req, res) => {
  const { sync_type = 'full' } = req.body;
  const channel = await ECommerceChannel.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  const syncLog = await ECommerceSyncLog.create({
    tenant_id: req.user?.tenant_id,
    channel_id: channel._id,
    sync_type,
    status: 'running',
    started_at: new Date(),
  });

  // TODO: Trigger actual sync job (queue-based)
  // For now, simulate completion
  setTimeout(async () => {
    await ECommerceSyncLog.findByIdAndUpdate(syncLog._id, {
      status: 'completed',
      records_synced: 0,
      completed_at: new Date(),
    });
    await ECommerceChannel.findByIdAndUpdate(channel._id, { last_sync_at: new Date(), status: 'active' });
  }, 1000);

  res.json({ message: 'Sync triggered', sync_log_id: syncLog._id });
}));

// Webhook receiver
router.post('/webhook/:channelId', asyncHandler(async (req, res) => {
  const channel = await ECommerceChannel.findById(req.params.channelId);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });

  // TODO: Verify webhook signature, process event
  console.log(`Webhook received for channel ${channel.channel_name}:`, req.body);

  res.json({ received: true });
}));

// Get sync logs
router.get('/channels/:id/sync-logs', asyncHandler(async (req, res) => {
  const { limit = 20, page = 1 } = req.query;
  const logs = await ECommerceSyncLog.find({
    channel_id: req.params.id,
    tenant_id: req.user?.tenant_id,
  })
    .sort({ started_at: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .lean();

  const total = await ECommerceSyncLog.countDocuments({ channel_id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ logs, total, page: Number(page), limit: Number(limit) });
}));

export default router;
