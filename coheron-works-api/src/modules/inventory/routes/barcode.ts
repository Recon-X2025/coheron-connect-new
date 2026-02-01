import { parseGS1Barcode, validateGTIN, generateGS1Barcode } from '../../../shared/utils/gs1Parser.js';
import express from 'express';
import { BarcodeLog } from '../../../models/BarcodeLog.js';
import { BinLocation } from '../../../models/BinLocation.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import mongoose from 'mongoose';

const router = express.Router();

// POST /scan - Process a barcode scan (lookup barcode, determine type, return entity details)
router.post('/scan', asyncHandler(async (req: any, res: any) => {
  const { barcode_value, action, warehouse_id, notes, tenant_id } = req.body;
  const scanned_by = req.body.scanned_by || req.user?._id;

  // Auto-detect GS1 barcode
  const isGS1 = /^(01|02|00|10|11|13|15|17|21|30|37|310|320|91|92|93|94|95|96|97|98|99)/.test(barcode_value);
  if (isGS1) {
    const gs1Parsed = parseGS1Barcode(barcode_value);
    if (gs1Parsed.gtin) {
      const Product = mongoose.model('Product');
      const product = await Product.findOne({ barcode: gs1Parsed.gtin }).lean();
      if (product) {
        const log = await BarcodeLog.create({ tenant_id, barcode_value, barcode_type: 'gs1', reference_type: 'product', reference_id: (product as any)._id, scanned_by, scanned_at: new Date(), action: action || 'count', warehouse_id, notes });
        return res.json({ type: 'gs1_product', entity: product, gs1: gs1Parsed, log });
      }
    }
  }
  // Try to find as bin location first
  const bin = await BinLocation.findOne({ barcode: barcode_value }).lean();
  if (bin) {
    const log = await BarcodeLog.create({
      tenant_id,
      barcode_value,
      barcode_type: 'bin',
      reference_type: 'bin_location',
      reference_id: bin._id,
      scanned_by,
      scanned_at: new Date(),
      action: action || 'count',
      warehouse_id: warehouse_id || bin.warehouse_id,
      notes,
    });
    return res.json({ type: 'bin_location', entity: bin, log });
  }

  // Try product barcode via Product model
  const Product = mongoose.model('Product');
  const product = await Product.findOne({ barcode: barcode_value }).lean();
  if (product) {
    const log = await BarcodeLog.create({
      tenant_id,
      barcode_value,
      barcode_type: 'product',
      reference_type: 'product',
      reference_id: (product as any)._id,
      scanned_by,
      scanned_at: new Date(),
      action: action || 'count',
      warehouse_id,
      notes,
    });
    return res.json({ type: 'product', entity: product, log });
  }

  return res.status(404).json({ error: 'Barcode not recognized' });
}));

// POST /receive - Scan to receive goods
router.post('/receive', asyncHandler(async (req: any, res: any) => {
  const { barcode_value, quantity, bin_id, tenant_id, warehouse_id } = req.body;
  const scanned_by = req.body.scanned_by || req.user?._id;

  const Product = mongoose.model('Product');
  const product = await Product.findOne({ barcode: barcode_value }).lean();
  if (!product) return res.status(404).json({ error: 'Product barcode not found' });

  const bin = await BinLocation.findById(bin_id);
  if (!bin) return res.status(404).json({ error: 'Bin not found' });

  bin.current_product_id = (product as any)._id;
  bin.current_quantity = (bin.current_quantity || 0) + (quantity || 1);
  await bin.save();

  const log = await BarcodeLog.create({
    tenant_id,
    barcode_value,
    barcode_type: 'product',
    reference_type: 'product',
    reference_id: (product as any)._id,
    scanned_by,
    scanned_at: new Date(),
    action: 'receive',
    warehouse_id,
    notes: 'Received qty ' + (quantity || 1) + ' into bin ' + bin.bin_code,
  });

  res.json({ product, bin, log });
}));

// POST /pick - Scan to pick for order
router.post('/pick', asyncHandler(async (req: any, res: any) => {
  const { barcode_value, order_id, tenant_id, warehouse_id } = req.body;
  const scanned_by = req.body.scanned_by || req.user?._id;

  const Product = mongoose.model('Product');
  const product = await Product.findOne({ barcode: barcode_value }).lean();
  if (!product) return res.status(404).json({ error: 'Product barcode not found' });

  const log = await BarcodeLog.create({
    tenant_id,
    barcode_value,
    barcode_type: 'product',
    reference_type: 'product',
    reference_id: (product as any)._id,
    scanned_by,
    scanned_at: new Date(),
    action: 'pick',
    warehouse_id,
    notes: 'Picked for order ' + order_id,
  });

  res.json({ product, log });
}));

// GET /log - Get scan history with filters
router.get('/log', asyncHandler(async (req: any, res: any) => {
  const { tenant_id, barcode_value, action, warehouse_id, from, to } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (barcode_value) filter.barcode_value = barcode_value;
  if (action) filter.action = action;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (from || to) {
    filter.scanned_at = {} as any;
    if (from) (filter.scanned_at as any).$gte = new Date(from as string);
    if (to) (filter.scanned_at as any).$lte = new Date(to as string);
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    BarcodeLog.find(filter).sort({ scanned_at: -1 }).lean(),
    pagination, filter, BarcodeLog
  );
  res.json(result);
}));


// POST /parse-gs1 - Parse GS1 barcode
router.post('/parse-gs1', asyncHandler(async (req: any, res: any) => {
  const { barcode_value } = req.body;
  if (!barcode_value) return res.status(400).json({ error: 'barcode_value required' });
  const parsed = parseGS1Barcode(barcode_value);
  const gtin_valid = parsed.gtin ? validateGTIN(parsed.gtin) : null;
  res.json({ ...parsed, gtin_valid });
}));

export default router;
