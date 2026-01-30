import express from 'express';
import { Invoice } from '../models/Invoice.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get all invoices
router.get('/', asyncHandler(async (req, res) => {
  const { state, payment_state, search } = req.query;
  const filter: any = {};

  if (state) filter.state = state;
  if (payment_state) filter.payment_state = payment_state;
  if (search) {
    filter.name = { $regex: search as string, $options: 'i' };
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Invoice.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    Invoice
  );
  res.json(result);
}));

// Get invoice by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).lean();

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json(invoice);
}));

// Create invoice
router.post('/', asyncHandler(async (req, res) => {
  const { name, partner_id, invoice_date, amount_total, amount_residual, state, payment_state, move_type } = req.body;

  const invoice = await Invoice.create({
    name,
    partner_id,
    invoice_date: invoice_date || new Date(),
    amount_total: amount_total || 0,
    amount_residual: amount_residual || amount_total || 0,
    state: state || 'draft',
    payment_state: payment_state || 'not_paid',
    move_type: move_type || 'out_invoice',
  });

  res.status(201).json(invoice);
}));

// Update invoice
router.put('/:id', asyncHandler(async (req, res) => {
  const { state, payment_state, amount_residual } = req.body;

  const updateData: any = {};
  if (state !== undefined) updateData.state = state;
  if (payment_state !== undefined) updateData.payment_state = payment_state;
  if (amount_residual !== undefined) updateData.amount_residual = amount_residual;

  const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json(invoice);
}));

// Delete invoice
router.delete('/:id', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  res.json({ message: 'Invoice deleted successfully' });
}));

export default router;
