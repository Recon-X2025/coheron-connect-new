import express from 'express';
import Batch from '../../../models/Batch.js';
import SerialNumber from '../../../models/SerialNumber.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// GET /expiring - Get batches expiring within N days (must be before /:id)
router.get('/expiring', authenticate, asyncHandler(async (req: any, res) => {
  const tenant_id = req.tenantId || req.headers['x-tenant-id'];
  const days = parseInt(req.query.days as string) || 30;
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const batches = await Batch.find({
    tenant_id,
    status: 'active',
    expiry_date: { $lte: expiryThreshold, $gte: now },
  })
    .populate('product_id', 'name sku')
    .populate('warehouse_id', 'name code')
    .sort({ expiry_date: 1 })
    .lean();

  res.json({ data: batches, count: batches.length });
}));

// GET / - List batches with filters
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const tenant_id = req.tenantId || req.headers['x-tenant-id'];
  const { product_id, status, expiry_before, search } = req.query;
  const filter: any = { tenant_id };

  if (product_id) filter.product_id = product_id;
  if (status) filter.status = status;
  if (expiry_before) filter.expiry_date = { $lte: new Date(expiry_before as string) };
  if (search) {
    filter.batch_number = { $regex: search, $options: 'i' };
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Batch.find(filter)
      .populate('product_id', 'name sku')
      .populate('warehouse_id', 'name code')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    Batch
  );

  res.json(result);
}));

// GET /:id - Get batch detail with serial numbers
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await Batch.findById(req.params.id)
    .populate('product_id', 'name sku')
    .populate('warehouse_id', 'name code')
    .populate('created_by', 'name')
    .lean();

  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  const serialNumbers = await SerialNumber.find({ batch_id: req.params.id })
    .populate('warehouse_id', 'name code')
    .sort({ serial_number: 1 })
    .lean();

  res.json({ ...batch, serial_numbers: serialNumbers });
}));

// POST / - Create batch
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const tenant_id = req.tenantId || req.headers['x-tenant-id'];

  const batch = await Batch.create({
    ...req.body,
    tenant_id,
    created_by: req.userId,
  });

  res.status(201).json(batch);
}));

// PUT /:id - Update batch
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const { quality_status, notes, status, quantity_available, quantity_reserved, quantity_sold } = req.body;
  const update: any = {};

  if (quality_status !== undefined) update.quality_status = quality_status;
  if (notes !== undefined) update.notes = notes;
  if (status !== undefined) update.status = status;
  if (quantity_available !== undefined) update.quantity_available = quantity_available;
  if (quantity_reserved !== undefined) update.quantity_reserved = quantity_reserved;
  if (quantity_sold !== undefined) update.quantity_sold = quantity_sold;

  const batch = await Batch.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  res.json(batch);
}));

// POST /:id/recall - Mark batch as recalled, update all serial numbers
router.post('/:id/recall', authenticate, asyncHandler(async (req: any, res) => {
  const batch = await Batch.findByIdAndUpdate(
    req.params.id,
    { status: 'recalled', notes: req.body.reason || 'Batch recalled' },
    { new: true }
  );

  if (!batch) {
    return res.status(404).json({ error: 'Batch not found' });
  }

  const result = await SerialNumber.updateMany(
    { batch_id: req.params.id, status: { $in: ['available', 'reserved'] } },
    { status: 'scrapped', notes: 'Recalled: ' + (req.body.reason || 'Batch recalled') }
  );

  res.json({
    batch,
    serial_numbers_updated: result.modifiedCount,
  });
}));

export default router;
