import express from 'express';
import { CrossDockOrder } from '../models/CrossDockOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET / - list cross-dock orders
router.get('/', asyncHandler(async (req: any, res) => {
  const { status, warehouse_id, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    CrossDockOrder.find(filter)
      .populate('warehouse_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    CrossDockOrder.countDocuments(filter),
  ]);

  res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
}));

// POST / - create cross-dock order
router.post('/', asyncHandler(async (req: any, res) => {
  const count = await CrossDockOrder.countDocuments({ tenant_id: req.user.tenant_id });
  const cross_dock_number = `CD-${String(count + 1).padStart(5, '0')}`;

  const order = await CrossDockOrder.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
    cross_dock_number,
    created_by: req.user._id,
  });
  res.status(201).json(order);
}));

// GET /:id - get cross-dock order
router.get('/:id', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('warehouse_id', 'name')
    .populate('items.product_id', 'name sku')
    .populate('items.inbound_po_id', 'po_number')
    .populate('items.outbound_order_id', 'order_number')
    .lean();
  if (!order) return res.status(404).json({ error: 'Cross-dock order not found' });
  res.json(order);
}));

// PUT /:id - update cross-dock order
router.put('/:id', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!order) return res.status(404).json({ error: 'Cross-dock order not found' });
  res.json(order);
}));

// DELETE /:id
router.delete('/:id', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOneAndDelete({
    _id: req.params.id,
    tenant_id: req.user.tenant_id,
    status: 'planned',
  });
  if (!order) return res.status(404).json({ error: 'Order not found or cannot be deleted' });
  res.json({ message: 'Cross-dock order deleted' });
}));

// POST /:id/receive - transition to receiving
router.post('/:id/receive', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'planned') return res.status(400).json({ error: 'Order must be in planned status' });

  order.status = 'receiving';
  order.actual_receipt_date = new Date();
  await order.save();
  res.json(order);
}));

// POST /:id/stage - transition to staging
router.post('/:id/stage', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'receiving') return res.status(400).json({ error: 'Order must be in receiving status' });

  order.status = 'staging';
  await order.save();
  res.json(order);
}));

// POST /:id/ship - transition to shipping
router.post('/:id/ship', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'staging') return res.status(400).json({ error: 'Order must be in staging status' });

  order.status = 'shipping';
  order.actual_ship_date = new Date();
  await order.save();
  res.json(order);
}));

// POST /:id/complete - complete cross-dock
router.post('/:id/complete', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'shipping') return res.status(400).json({ error: 'Order must be in shipping status' });

  order.status = 'completed';
  await order.save();
  res.json(order);
}));

// PUT /:id/items/:idx - update item status/quantities
router.put('/:id/items/:idx', asyncHandler(async (req: any, res) => {
  const order = await CrossDockOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const idx = Number(req.params.idx);
  if (idx < 0 || idx >= order.items.length) {
    return res.status(400).json({ error: 'Invalid item index' });
  }

  const item = order.items[idx];
  if (req.body.received_quantity !== undefined) item.received_quantity = req.body.received_quantity;
  if (req.body.shipped_quantity !== undefined) item.shipped_quantity = req.body.shipped_quantity;
  if (req.body.status) item.status = req.body.status;

  await order.save();
  res.json(order);
}));

export default router;
