import express from 'express';
import { MRPRun, MRPDemand, MRPPlannedOrder } from '../../../models/MRP.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get MRP runs
router.get('/runs', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    MRPRun.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, MRPRun
  );
  res.json(result);
}));

// Get single run
router.get('/runs/:id', asyncHandler(async (req, res) => {
  const run = await MRPRun.findById(req.params.id).lean();
  if (!run) return res.status(404).json({ error: 'MRP run not found' });
  res.json(run);
}));

// Create MRP run
router.post('/runs', asyncHandler(async (req, res) => {
  const run = await MRPRun.create(req.body);
  res.status(201).json(run);
}));

// Update run status
router.put('/runs/:id', asyncHandler(async (req, res) => {
  const run = await MRPRun.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!run) return res.status(404).json({ error: 'MRP run not found' });
  res.json(run);
}));

// Get demands for a run
router.get('/runs/:id/demands', asyncHandler(async (req, res) => {
  const { resolved } = req.query;
  const filter: any = { run_id: req.params.id };
  if (resolved !== undefined) filter.resolved = resolved === 'true';

  const demands = await MRPDemand.find(filter)
    .populate('product_id', 'name')
    .sort({ required_date: 1 })
    .lean();
  res.json(demands);
}));

// Get planned orders for a run
router.get('/runs/:id/planned-orders', asyncHandler(async (req, res) => {
  const { status, order_type } = req.query;
  const filter: any = { run_id: req.params.id };
  if (status) filter.status = status;
  if (order_type) filter.order_type = order_type;

  const orders = await MRPPlannedOrder.find(filter)
    .populate('product_id', 'name')
    .sort({ required_date: 1 })
    .lean();
  res.json(orders);
}));

// Confirm planned order
router.post('/planned-orders/:id/confirm', asyncHandler(async (req, res) => {
  const order = await MRPPlannedOrder.findByIdAndUpdate(req.params.id, {
    status: 'confirmed',
    confirmed_at: new Date(),
    confirmed_by: req.body.confirmed_by,
    confirmed_order_id: req.body.confirmed_order_id,
  }, { new: true });
  if (!order) return res.status(404).json({ error: 'Planned order not found' });
  res.json(order);
}));

// Cancel planned order
router.post('/planned-orders/:id/cancel', asyncHandler(async (req, res) => {
  const order = await MRPPlannedOrder.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
  if (!order) return res.status(404).json({ error: 'Planned order not found' });
  res.json(order);
}));

export default router;
