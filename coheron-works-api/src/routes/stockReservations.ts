import express from 'express';
import { StockReservation } from '../models/StockReservation.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { product_id, warehouse_id, status, source_type } = req.query;
  const filter: any = {};
  if (product_id) filter.product_id = product_id;
  if (warehouse_id) filter.warehouse_id = warehouse_id;
  if (status) filter.status = status;
  if (source_type) filter.source_type = source_type;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    StockReservation.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, StockReservation
  );
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const reservation = await StockReservation.findById(req.params.id).lean();
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
}));

router.post('/', asyncHandler(async (req, res) => {
  const reservation = await StockReservation.create(req.body);
  res.status(201).json(reservation);
}));

router.post('/:id/fulfill', asyncHandler(async (req, res) => {
  const reservation = await StockReservation.findByIdAndUpdate(req.params.id, {
    status: 'fulfilled',
    fulfilled_at: new Date(),
  }, { new: true });
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
}));

router.post('/:id/cancel', asyncHandler(async (req, res) => {
  const { cancel_reason } = req.body;
  const reservation = await StockReservation.findByIdAndUpdate(req.params.id, {
    status: 'cancelled',
    cancelled_at: new Date(),
    cancel_reason,
  }, { new: true });
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  res.json(reservation);
}));

export default router;
