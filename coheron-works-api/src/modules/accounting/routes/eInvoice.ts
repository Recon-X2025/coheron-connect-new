import express from 'express';
import { EInvoice } from '../../../models/EInvoice.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    EInvoice.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, EInvoice
  );
  res.json(result);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const doc = await EInvoice.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: 'E-Invoice not found' });
  res.json(doc);
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const doc = await EInvoice.create(req.body);
  res.status(201).json(doc);
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const doc = await EInvoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!doc) return res.status(404).json({ error: 'E-Invoice not found' });
  res.json(doc);
}));

router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const { cancel_reason, cancel_remark } = req.body;
  const doc = await EInvoice.findByIdAndUpdate(req.params.id, {
    status: 'cancelled',
    cancel_reason,
    cancel_remark,
    cancelled_at: new Date(),
  }, { new: true });
  if (!doc) return res.status(404).json({ error: 'E-Invoice not found' });
  res.json(doc);
}));

export default router;
