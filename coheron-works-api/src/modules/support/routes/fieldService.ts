import express from 'express';
import { FieldServiceOrder } from '../../../models/FieldServiceOrder.js';
import { Warranty } from '../../../models/Warranty.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// GET /orders
router.get('/orders', asyncHandler(async (req, res) => {
  const { technician_id, status, scheduled_date, customer_id } = req.query;
  const filter: any = {};
  if (technician_id) filter.technician_id = technician_id;
  if (status) filter.status = status;
  if (customer_id) filter.customer_id = customer_id;
  if (scheduled_date) filter.scheduled_date = new Date(scheduled_date as string);
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    FieldServiceOrder.find(filter).populate('customer_id', 'name')
      .populate('technician_id').sort({ scheduled_date: -1 }).lean(),
    pagination, filter, FieldServiceOrder);
  res.json(result);
}));

// POST /orders
router.post('/orders', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.create(req.body);
  res.status(201).json(order);
}));

// GET /orders/:id
router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.findById(req.params.id)
    .populate('customer_id').populate('technician_id')
    .populate('warranty_id').lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}));

// PUT /orders/:id
router.put('/orders/:id', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}));

// POST /orders/:id/dispatch
router.post('/orders/:id/dispatch', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.findByIdAndUpdate(req.params.id,
    { status: 'dispatched' }, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}));

// POST /orders/:id/start
router.post('/orders/:id/start', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.findByIdAndUpdate(req.params.id,
    { status: 'in_progress', actual_start: new Date() }, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}));

// POST /orders/:id/complete
router.post('/orders/:id/complete', asyncHandler(async (req, res) => {
  const { parts_used, photos, customer_signature_url, notes, rating, feedback } = req.body;
  const update: any = {
    status: 'completed', actual_end: new Date(),
    customer_signature_url, notes, rating, feedback,
  };
  if (parts_used) update.parts_used = parts_used;
  if (photos) update.photos = photos;
  const order = await FieldServiceOrder.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}));

// POST /orders/:id/cancel
router.post('/orders/:id/cancel', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.findByIdAndUpdate(req.params.id,
    { status: 'cancelled' }, { new: true });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}));

// GET /orders/:id/warranty-check
router.get('/orders/:id/warranty-check', asyncHandler(async (req, res) => {
  const order = await FieldServiceOrder.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const filter: any = { customer_id: order.customer_id };
  if (order.product_id) filter.product_id = order.product_id;
  if (order.serial_number_id) filter.serial_number_id = order.serial_number_id;
  filter.status = 'active';
  filter.end_date = { $gte: new Date() };
  const warranty = await Warranty.findOne(filter).lean();
  res.json({ under_warranty: !!warranty, warranty });
}));

// GET /technician-schedule
router.get('/technician-schedule', asyncHandler(async (req, res) => {
  const { technician_id, date } = req.query;
  const filter: any = {};
  if (technician_id) filter.technician_id = technician_id;
  if (date) {
    const d = new Date(date as string);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    filter.scheduled_date = { $gte: d, $lt: next };
  }
  const orders = await FieldServiceOrder.find(filter)
    .populate('customer_id', 'name').sort({ scheduled_date: 1 }).lean();
  res.json(orders);
}));

// GET /warranties
router.get('/warranties', asyncHandler(async (req, res) => {
  const { customer_id, status } = req.query;
  const filter: any = {};
  if (customer_id) filter.customer_id = customer_id;
  if (status) filter.status = status;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Warranty.find(filter).populate('customer_id', 'name')
      .populate('product_id', 'name').sort({ created_at: -1 }).lean(),
    pagination, filter, Warranty);
  res.json(result);
}));

// POST /warranties
router.post('/warranties', asyncHandler(async (req, res) => {
  const warranty = await Warranty.create(req.body);
  res.status(201).json(warranty);
}));

// GET /warranties/:id
router.get('/warranties/:id', asyncHandler(async (req, res) => {
  const warranty = await Warranty.findById(req.params.id)
    .populate('customer_id').populate('product_id').lean();
  if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
  res.json(warranty);
}));

// POST /warranties/:id/claim
router.post('/warranties/:id/claim', asyncHandler(async (req, res) => {
  const warranty = await Warranty.findById(req.params.id);
  if (!warranty) return res.status(404).json({ error: 'Warranty not found' });
  if (warranty.status !== 'active')
    return res.status(400).json({ error: 'Warranty is not active' });
  if (warranty.end_date < new Date())
    return res.status(400).json({ error: 'Warranty has expired' });
  const cd = warranty.coverage_details;
  if (cd?.max_claims && warranty.claims_made >= cd.max_claims)
    return res.status(400).json({ error: 'Maximum claims reached' });
  const { amount } = req.body;
  if (cd?.max_amount && (warranty.amount_claimed + (amount || 0)) > cd.max_amount)
    return res.status(400).json({ error: 'Exceeds maximum claim amount' });
  warranty.claims_made += 1;
  warranty.amount_claimed += (req.body.amount || 0);
  await warranty.save();
  res.json(warranty);
}));

// GET /warranties/expiring
router.get('/warranties/expiring', asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const future = new Date();
  future.setDate(future.getDate() + days);
  const warranties = await Warranty.find({
    status: 'active', end_date: { $gte: new Date(), $lte: future }
  }).populate('customer_id', 'name').populate('product_id', 'name')
    .sort({ end_date: 1 }).lean();
  res.json(warranties);
}));

export default router;
