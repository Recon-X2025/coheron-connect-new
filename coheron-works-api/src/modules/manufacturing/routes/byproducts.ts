import express from 'express';
import { ByProduct } from '../models/ByProduct.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const { type, status, product_id, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (product_id) filter.product_id = product_id;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    ByProduct.find(filter).populate('product_id', 'name sku').populate('manufacturing_order_id', 'order_number').sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    ByProduct.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

// POST /
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const bp = await ByProduct.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(bp);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const bp = await ByProduct.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('product_id', 'name sku').populate('manufacturing_order_id', 'order_number').lean();
  if (!bp) return res.status(404).json({ error: 'By-product not found' });
  res.json(bp);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const bp = await ByProduct.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true }
  );
  if (!bp) return res.status(404).json({ error: 'By-product not found' });
  res.json(bp);
}));

// DELETE /:id
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const bp = await ByProduct.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id, status: 'planned' });
  if (!bp) return res.status(404).json({ error: 'By-product not found or cannot be deleted' });
  res.json({ message: 'By-product deleted' });
}));

// GET /by-order/:orderId
router.get('/by-order/:orderId', authenticate, asyncHandler(async (req: any, res) => {
  const bps = await ByProduct.find({
    tenant_id: req.user.tenant_id,
    manufacturing_order_id: req.params.orderId,
  }).populate('product_id', 'name sku').lean();
  res.json(bps);
}));

// POST /:id/receive
router.post('/:id/receive', authenticate, asyncHandler(async (req: any, res) => {
  const bp = await ByProduct.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!bp) return res.status(404).json({ error: 'By-product not found' });
  if (bp.status !== 'produced') return res.status(400).json({ error: 'By-product must be in produced status' });
  if (req.body.warehouse_id) bp.warehouse_id = req.body.warehouse_id;
  if (req.body.actual_quantity !== undefined) bp.actual_quantity = req.body.actual_quantity;
  await bp.save();
  res.json(bp);
}));

// GET /cost-analysis
router.get('/cost-analysis', authenticate, asyncHandler(async (req: any, res) => {
  const bps = await ByProduct.find({ tenant_id: req.user.tenant_id }).populate('product_id', 'name sku').lean();

  const byType: Record<string, number> = { byproduct: 0, coproduct: 0 };
  const byMethod: Record<string, number> = {};
  let totalAllocation = 0;

  for (const bp of bps) {
    byType[bp.type] = (byType[bp.type] || 0) + 1;
    byMethod[bp.cost_allocation_method] = (byMethod[bp.cost_allocation_method] || 0) + 1;
    totalAllocation += bp.cost_allocation_percentage;
  }

  res.json({ total: bps.length, by_type: byType, by_allocation_method: byMethod, avg_allocation_percentage: bps.length > 0 ? Math.round((totalAllocation / bps.length) * 100) / 100 : 0 });
}));

export default router;
