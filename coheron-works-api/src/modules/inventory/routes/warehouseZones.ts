import express from 'express';
import { WarehouseZone } from '../../../models/WarehouseZone.js';
import { BinLocation } from '../../../models/BinLocation.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import crypto from 'crypto';

const router = express.Router();

// GET /zones - list zones by warehouse
router.get('/zones', authenticate, asyncHandler(async (req: any, res: any) => {
  const { warehouse_id, zone_type, is_active } = req.query;
  const filter: any = {};
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (zone_type) filter.zone_type = zone_type;
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    WarehouseZone.find(filter).sort({ code: 1 }).lean(),
    pagination, filter, WarehouseZone
  );
  res.json(result);
}));

// POST /zones - create zone
router.post('/zones', authenticate, asyncHandler(async (req: any, res: any) => {
  const zone = await WarehouseZone.create(req.body);
  res.status(201).json(zone);
}));

// PUT /zones/:id - update zone
router.put('/zones/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const zone = await WarehouseZone.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!zone) return res.status(404).json({ error: 'Zone not found' });
  res.json(zone);
}));

// GET /bins - list bins with filters
router.get('/bins', authenticate, asyncHandler(async (req: any, res: any) => {
  const { warehouse_id, zone_id, is_active, available, product_id } = req.query;
  const filter: any = {};
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (zone_id) filter.zone_id = zone_id;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (available === 'true') filter.current_product_id = null;
  if (product_id) filter.current_product_id = product_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    BinLocation.find(filter).sort({ bin_code: 1 }).lean(),
    pagination, filter, BinLocation
  );
  res.json(result);
}));

// POST /bins - create bin
router.post('/bins', authenticate, asyncHandler(async (req: any, res: any) => {
  const data = { ...req.body };
  if (!data.barcode) {
    data.barcode = 'BIN-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  }
  const bin = await BinLocation.create(data);
  res.status(201).json(bin);
}));

// PUT /bins/:id - update bin
router.put('/bins/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const bin = await BinLocation.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  res.json(bin);
}));

// POST /bins/:id/assign - assign product to bin
router.post('/bins/:id/assign', authenticate, asyncHandler(async (req: any, res: any) => {
  const { product_id, quantity } = req.body;
  const bin = await BinLocation.findByIdAndUpdate(req.params.id, {
    current_product_id: product_id,
    current_quantity: quantity || 0,
  }, { new: true });
  if (!bin) return res.status(404).json({ error: 'Bin not found' });
  res.json(bin);
}));

// POST /bins/:id/transfer - transfer contents to another bin
router.post('/bins/:id/transfer', authenticate, asyncHandler(async (req: any, res: any) => {
  const { target_bin_id } = req.body;
  const sourceBin = await BinLocation.findById(req.params.id);
  if (!sourceBin) return res.status(404).json({ error: 'Source bin not found' });
  const targetBin = await BinLocation.findById(target_bin_id);
  if (!targetBin) return res.status(404).json({ error: 'Target bin not found' });

  targetBin.current_product_id = sourceBin.current_product_id;
  targetBin.current_quantity = sourceBin.current_quantity;
  sourceBin.current_product_id = null as any;
  sourceBin.current_quantity = 0;

  await sourceBin.save();
  await targetBin.save();

  res.json({ source: sourceBin, target: targetBin });
}));

export default router;
