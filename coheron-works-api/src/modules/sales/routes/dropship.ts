import express from 'express';
import { DropshipOrder } from '../../../models/DropshipOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// List dropship orders
router.get('/', asyncHandler(async (req, res) => {
  const { status, customer_id, vendor_id } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (vendor_id) filter.vendor_id = vendor_id;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(DropshipOrder.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, DropshipOrder);
  res.json(result);
}));

// Create dropship from sale order
router.post('/', asyncHandler(async (req, res) => {
  const data = { ...req.body, tenant_id: (req as any).tenantId, created_by: (req as any).userId };
  // Calculate totals
  if (data.items) {
    data.customer_total = data.items.reduce((s: number, i: any) => s + i.unit_price_customer * i.quantity, 0);
    data.vendor_total = data.items.reduce((s: number, i: any) => s + i.unit_price_vendor * i.quantity, 0);
    data.margin_total = data.customer_total - data.vendor_total;
    data.items.forEach((i: any) => { i.margin = (i.unit_price_customer - i.unit_price_vendor) * i.quantity; });
  }
  const order = await DropshipOrder.create(data);
  res.status(201).json(order);
}));

// Get detail
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await DropshipOrder.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ error: 'Dropship order not found' });
  res.json(order);
}));

// Update status
router.put('/:id/status', asyncHandler(async (req, res) => {
  const { status, tracking_number, tracking_url } = req.body;
  const update: any = { status };
  if (tracking_number) update.tracking_number = tracking_number;
  if (tracking_url) update.tracking_url = tracking_url;
  const order = await DropshipOrder.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!order) return res.status(404).json({ error: 'Dropship order not found' });
  res.json(order);
}));

// Create PO for vendor
router.post('/:id/create-po', asyncHandler(async (req, res) => {
  const order = await DropshipOrder.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Dropship order not found' });
  if (order.status !== 'pending') return res.status(400).json({ error: 'PO already created or invalid status' });
  if (req.body.purchase_order_id) order.purchase_order_id = req.body.purchase_order_id;
  order.status = 'po_created';
  await order.save();
  res.json(order);
}));

// Margin report
router.get('/margin-report', asyncHandler(async (req, res) => {
  const filter: any = { tenant_id: (req as any).tenantId };
  if (req.query.vendor_id) filter.vendor_id = req.query.vendor_id;
  if (req.query.status) filter.status = req.query.status;
  const orders = await DropshipOrder.find(filter).lean();
  const totalCustomer = orders.reduce((s, o) => s + (o.customer_total || 0), 0);
  const totalVendor = orders.reduce((s, o) => s + (o.vendor_total || 0), 0);
  const totalMargin = orders.reduce((s, o) => s + (o.margin_total || 0), 0);
  const marginPct = totalCustomer ? (totalMargin / totalCustomer) * 100 : 0;
  res.json({
    total_orders: orders.length, total_customer: totalCustomer,
    total_vendor: totalVendor, total_margin: totalMargin,
    margin_pct: Math.round(marginPct * 100) / 100,
  });
}));

export default router;
