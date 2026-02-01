import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { BlanketOrder } from '../models/BlanketOrder.js';
import { BlanketRelease } from '../models/BlanketRelease.js';

const router = express.Router();

// List blanket orders
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { status, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id: tenantId };
  if (status) filter.status = status;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [items, total] = await Promise.all([
    BlanketOrder.find(filter).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).populate('partner_id', 'name').lean(),
    BlanketOrder.countDocuments(filter),
  ]);
  res.json({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// Get by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const item = await BlanketOrder.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).populate('partner_id created_by').lean();
  if (!item) return res.status(404).json({ error: 'Blanket order not found' });
  res.json(item);
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const { order_number, partner_id, start_date, end_date, lines, terms } = req.body;
  const total_value = (lines || []).reduce((sum: number, l: any) => sum + (l.quantity * l.unit_price), 0);
  const item = await BlanketOrder.create({
    tenant_id: req.user?.tenant_id,
    order_number,
    partner_id,
    start_date,
    end_date,
    lines: (lines || []).map((l: any) => ({ ...l, released_quantity: 0 })),
    total_value,
    remaining_value: total_value,
    released_value: 0,
    terms,
    created_by: req.user?.userId,
  });
  res.status(201).json(item);
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const item = await BlanketOrder.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Blanket order not found' });
  res.json(item);
}));

// Create a release from blanket order
router.post('/:id/release', asyncHandler(async (req, res) => {
  const order = await BlanketOrder.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!order) return res.status(404).json({ error: 'Blanket order not found' });
  if (order.status !== 'active') return res.status(400).json({ error: 'Order is not active' });

  const { release_number, lines } = req.body;
  const total_value = (lines || []).reduce((sum: number, l: any) => sum + (l.quantity * l.unit_price), 0);

  if (total_value > order.remaining_value) {
    return res.status(400).json({ error: 'Release value exceeds remaining blanket order value' });
  }

  const release = await BlanketRelease.create({
    tenant_id: req.user?.tenant_id,
    blanket_order_id: order._id,
    release_number,
    release_date: new Date(),
    lines,
    total_value,
    status: 'draft',
    created_by: req.user?.userId,
  });

  // Update blanket order values
  order.released_value += total_value;
  order.remaining_value -= total_value;
  // Update released quantities on lines
  for (const rl of lines || []) {
    const orderLine = order.lines.find((ol: any) => ol.product_id?.toString() === rl.product_id);
    if (orderLine) orderLine.released_quantity += rl.quantity;
  }
  if (order.remaining_value <= 0) order.status = 'completed';
  await order.save();

  res.status(201).json(release);
}));

// Get releases for a blanket order
router.get('/:id/releases', asyncHandler(async (req, res) => {
  const releases = await BlanketRelease.find({ blanket_order_id: req.params.id, tenant_id: req.user?.tenant_id }).sort({ created_at: -1 }).lean();
  res.json(releases);
}));

// Expiring soon (within 30 days)
router.get('/expiring-soon', asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const items = await BlanketOrder.find({
    tenant_id: req.user?.tenant_id,
    status: 'active',
    end_date: { $lte: thirtyDays, $gte: now },
  }).populate('partner_id', 'name').lean();
  res.json(items);
}));

export default router;
