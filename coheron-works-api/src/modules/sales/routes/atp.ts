import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { ATPRecord } from '../models/ATPRecord.js';

const router = express.Router();

// Check ATP for a single product
router.post('/check', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { product_id, quantity, requested_date } = req.body;
  const date = requested_date ? new Date(requested_date) : new Date();

  const records = await ATPRecord.find({
    tenant_id: tenantId,
    product_id,
    date: { $lte: date },
  }).sort({ date: -1 }).lean();

  // Group by warehouse, take latest per warehouse
  const warehouseMap = new Map<string, any>();
  for (const r of records) {
    const wid = String(r.warehouse_id);
    if (!warehouseMap.has(wid)) warehouseMap.set(wid, r);
  }

  const warehouses = Array.from(warehouseMap.values());
  const totalAvailable = warehouses.reduce((sum, w) => sum + w.available, 0);
  const canFulfill = totalAvailable >= quantity;

  // Find earliest date where full quantity is available
  let earliestDate = null;
  if (!canFulfill) {
    const futureRecords = await ATPRecord.aggregate([
      { $match: { tenant_id: tenantId, product_id, date: { $gt: date } } },
      { $group: { _id: '$date', total_available: { $sum: '$available' } } },
      { $match: { total_available: { $gte: quantity } } },
      { $sort: { _id: 1 } },
      { $limit: 1 },
    ]);
    if (futureRecords.length > 0) earliestDate = futureRecords[0]._id;
  }

  res.json({
    product_id,
    requested_quantity: quantity,
    requested_date: date,
    available: canFulfill,
    total_available: totalAvailable,
    earliest_date: canFulfill ? date : earliestDate,
    warehouse_breakdown: warehouses.map(w => ({
      warehouse_id: w.warehouse_id,
      on_hand: w.on_hand,
      allocated: w.allocated,
      incoming: w.incoming,
      available: w.available,
    })),
  });
}));

// Check ATP for all order lines
router.post('/check-order', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { lines } = req.body;
  if (!Array.isArray(lines)) return res.status(400).json({ error: 'lines required' });

  const results = [];
  for (const line of lines) {
    const records = await ATPRecord.find({
      tenant_id: tenantId,
      product_id: line.product_id,
      date: { $lte: new Date(line.requested_date || Date.now()) },
    }).sort({ date: -1 }).lean();

    const warehouseMap = new Map<string, any>();
    for (const r of records) {
      const wid = String(r.warehouse_id);
      if (!warehouseMap.has(wid)) warehouseMap.set(wid, r);
    }
    const totalAvailable = Array.from(warehouseMap.values()).reduce((s, w) => s + w.available, 0);

    results.push({
      product_id: line.product_id,
      requested_quantity: line.quantity,
      available: totalAvailable >= line.quantity,
      total_available: totalAvailable,
    });
  }
  res.json({ lines: results, all_available: results.every(r => r.available) });
}));

// Timeline for a product
router.get('/timeline/:productId', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { days = '30' } = req.query;
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(days as string));

  const timeline = await ATPRecord.aggregate([
    { $match: { tenant_id: tenantId, product_id: req.params.productId, date: { $lte: endDate } } },
    { $group: {
      _id: '$date',
      total_on_hand: { $sum: '$on_hand' },
      total_allocated: { $sum: '$allocated' },
      total_incoming: { $sum: '$incoming' },
      total_available: { $sum: '$available' },
    }},
    { $sort: { _id: 1 } },
  ]);
  res.json(timeline);
}));

// Reserve stock (soft reservation)
router.post('/reserve', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { product_id, warehouse_id, quantity } = req.body;

  const record = await ATPRecord.findOne({
    tenant_id: tenantId,
    product_id,
    warehouse_id,
    date: { $lte: new Date() },
  }).sort({ date: -1 });

  if (!record) return res.status(404).json({ error: 'No ATP record found' });
  if (record.available < quantity) return res.status(400).json({ error: 'Insufficient available quantity', available: record.available });

  record.allocated += quantity;
  record.available -= quantity;
  await record.save();
  res.json({ success: true, record });
}));

// Release reservation
router.delete('/reserve/:id', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { quantity } = req.body;
  const record = await ATPRecord.findOne({ _id: req.params.id, tenant_id: tenantId });
  if (!record) return res.status(404).json({ error: 'ATP record not found' });

  const releaseQty = quantity || 0;
  record.allocated = Math.max(0, record.allocated - releaseQty);
  record.available += releaseQty;
  await record.save();
  res.json({ success: true, record });
}));

// List all ATP records (for admin/dashboard)
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { product_id, warehouse_id, page = '1', limit = '50' } = req.query;
  const filter: any = { tenant_id: tenantId };
  if (product_id) filter.product_id = product_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [items, total] = await Promise.all([
    ATPRecord.find(filter).sort({ date: -1 }).skip(skip).limit(parseInt(limit as string)).lean(),
    ATPRecord.countDocuments(filter),
  ]);
  res.json({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

export default router;
