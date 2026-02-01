import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { KitchenStation } from '../models/KitchenStation.js';
import { KitchenOrder } from '../models/KitchenOrder.js';

const router = express.Router();

// --- Stations ---
router.get('/stations', asyncHandler(async (req, res) => {
  const items = await KitchenStation.find({ tenant_id: req.user?.tenant_id }).sort({ name: 1 }).lean();
  res.json(items);
}));

router.post('/stations', asyncHandler(async (req, res) => {
  const item = await KitchenStation.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(item);
}));

router.put('/stations/:id', asyncHandler(async (req, res) => {
  const item = await KitchenStation.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { $set: req.body }, { new: true });
  if (!item) return res.status(404).json({ error: 'Station not found' });
  res.json(item);
}));

router.delete('/stations/:id', asyncHandler(async (req, res) => {
  await KitchenStation.deleteOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// --- Orders ---
router.get('/orders', asyncHandler(async (req, res) => {
  const { station_id, status } = req.query;
  const filter: any = { tenant_id: req.user?.tenant_id };
  if (station_id) filter.station_id = station_id;
  if (status) filter.status = status;
  else filter.status = { $in: ['pending', 'in_progress', 'ready'] };
  const items = await KitchenOrder.find(filter).sort({ priority: -1, received_at: 1 }).populate('station_id', 'name display_color').lean();
  res.json(items);
}));

router.post('/orders', asyncHandler(async (req, res) => {
  const item = await KitchenOrder.create({ ...req.body, tenant_id: req.user?.tenant_id, received_at: new Date() });
  res.status(201).json(item);
}));

// Update item status
router.put('/orders/:id/items/:itemIndex/status', asyncHandler(async (req, res) => {
  const order = await KitchenOrder.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const idx = parseInt(req.params.itemIndex);
  if (idx < 0 || idx >= order.items.length) return res.status(400).json({ error: 'Invalid item index' });

  const { status } = req.body;
  order.items[idx].status = status;
  if (status === 'preparing' && !order.items[idx].started_at) order.items[idx].started_at = new Date();
  if (status === 'ready' || status === 'served') order.items[idx].completed_at = new Date();

  // Update order status based on items
  const allReady = order.items.every((i: any) => i.status === 'ready' || i.status === 'served');
  const anyPreparing = order.items.some((i: any) => i.status === 'preparing');
  if (allReady) {
    order.status = 'ready';
    order.completed_at = new Date();
    if (order.started_at) order.avg_prep_time = (order.completed_at.getTime() - order.started_at.getTime()) / 1000;
  } else if (anyPreparing) {
    order.status = 'in_progress';
    if (!order.started_at) order.started_at = new Date();
  }

  await order.save();
  res.json(order);
}));

// Bump order (mark ready)
router.put('/orders/:id/bump', asyncHandler(async (req, res) => {
  const order = await KitchenOrder.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.status = 'completed';
  order.completed_at = new Date();
  if (order.started_at) order.avg_prep_time = (order.completed_at.getTime() - order.started_at.getTime()) / 1000;
  order.items.forEach((item: any) => {
    if (item.status !== 'served') item.status = 'served';
    if (!item.completed_at) item.completed_at = new Date();
  });
  await order.save();
  res.json(order);
}));

// Stats
router.get('/stats', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const [pending, inProgress, completed] = await Promise.all([
    KitchenOrder.countDocuments({ tenant_id: tenantId, status: 'pending' }),
    KitchenOrder.countDocuments({ tenant_id: tenantId, status: 'in_progress' }),
    KitchenOrder.countDocuments({ tenant_id: tenantId, status: { $in: ['ready', 'completed'] } }),
  ]);
  const avgResult = await KitchenOrder.aggregate([
    { $match: { tenant_id: tenantId, avg_prep_time: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: '$avg_prep_time' } } },
  ]);
  res.json({ pending, in_progress: inProgress, completed, avg_prep_time: avgResult[0]?.avg || 0 });
}));

export default router;
