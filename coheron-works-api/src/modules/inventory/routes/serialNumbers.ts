import express from 'express';
import SerialNumber from '../../../models/SerialNumber.js';
import StockMoveLine from '../../../models/StockMoveLine.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// GET / - List serial numbers with filters + pagination
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const tenant_id = req.tenantId || req.headers['x-tenant-id'];
  const { product_id, status, batch_id, warehouse_id, search } = req.query;
  const filter: any = { tenant_id };

  if (product_id) filter.product_id = product_id;
  if (status) filter.status = status;
  if (batch_id) filter.batch_id = batch_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (search) {
    filter.serial_number = { $regex: search, $options: 'i' };
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SerialNumber.find(filter)
      .populate('product_id', 'name sku')
      .populate('batch_id', 'batch_number')
      .populate('warehouse_id', 'name code')
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    SerialNumber
  );

  res.json(result);
}));

// GET /:id - Get serial number detail
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const serial = await SerialNumber.findById(req.params.id)
    .populate('product_id', 'name sku')
    .populate('batch_id', 'batch_number')
    .populate('warehouse_id', 'name code')
    .populate('purchase_order_id', 'name')
    .populate('sale_order_id', 'name')
    .populate('created_by', 'name')
    .lean();

  if (!serial) {
    return res.status(404).json({ error: 'Serial number not found' });
  }

  res.json(serial);
}));

// POST / - Create serial number(s) - accept count for bulk generation
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const tenant_id = req.tenantId || req.headers['x-tenant-id'];
  const { count, prefix, start_number, ...baseData } = req.body;

  if (count && count > 1) {
    const serials = [];
    const startNum = start_number || 1;
    const pfx = prefix || 'SN';
    for (let i = 0; i < count; i++) {
      serials.push({
        ...baseData,
        tenant_id,
        serial_number: pfx + '-' + String(startNum + i).padStart(6, '0'),
        created_by: req.userId,
      });
    }
    const created = await SerialNumber.insertMany(serials);
    return res.status(201).json({ data: created, count: created.length });
  }

  const serial = await SerialNumber.create({
    ...baseData,
    tenant_id,
    created_by: req.userId,
  });

  res.status(201).json(serial);
}));

// PUT /:id - Update serial number
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const { status, location_bin, warehouse_id, notes, sale_order_id, warranty_start, warranty_end } = req.body;
  const update: any = {};

  if (status !== undefined) update.status = status;
  if (location_bin !== undefined) update.location_bin = location_bin;
  if (warehouse_id !== undefined) update.warehouse_id = warehouse_id;
  if (notes !== undefined) update.notes = notes;
  if (sale_order_id !== undefined) update.sale_order_id = sale_order_id;
  if (warranty_start !== undefined) update.warranty_start = warranty_start;
  if (warranty_end !== undefined) update.warranty_end = warranty_end;

  const serial = await SerialNumber.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
  if (!serial) {
    return res.status(404).json({ error: 'Serial number not found' });
  }

  res.json(serial);
}));

// POST /:id/transfer - Transfer to different warehouse/bin
router.post('/:id/transfer', authenticate, asyncHandler(async (req: any, res) => {
  const { to_warehouse_id, to_bin } = req.body;

  const serial = await SerialNumber.findById(req.params.id);
  if (!serial) {
    return res.status(404).json({ error: 'Serial number not found' });
  }

  const from_warehouse_id = serial.warehouse_id;
  const from_bin = serial.location_bin;

  serial.warehouse_id = to_warehouse_id;
  serial.location_bin = to_bin;
  await serial.save();

  await StockMoveLine.create({
    tenant_id: serial.tenant_id,
    stock_move_id: serial._id,
    product_id: serial.product_id,
    serial_number_id: serial._id,
    quantity: 1,
    from_warehouse_id,
    to_warehouse_id,
    from_bin,
    to_bin,
  });

  res.json(serial);
}));

// GET /:id/history - Get movement history for this serial number
router.get('/:id/history', authenticate, asyncHandler(async (req: any, res) => {
  const moves = await StockMoveLine.find({ serial_number_id: req.params.id })
    .populate('from_warehouse_id', 'name code')
    .populate('to_warehouse_id', 'name code')
    .populate('stock_move_id')
    .sort({ created_at: -1 })
    .lean();

  res.json({ data: moves });
}));

export default router;
