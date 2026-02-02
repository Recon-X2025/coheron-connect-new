import express from 'express';
import { Queue } from 'bullmq';
import { Invoice } from '../../../models/Invoice.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { invoiceEmailTemplate } from '../../../templates/email/invoiceTemplate.js';
import { redisConnection } from '../../../jobs/connection.js';
import { validate } from '../../../shared/middleware/validate.js';
import { objectIdParam } from '../../../shared/schemas/common.js';
import { createInvoiceSchema, updateInvoiceSchema, sendInvoiceSchema } from '../schemas.js';
import { eventBus } from '../../../orchestration/EventBus.js';
import { INVOICE_CREATED, INVOICE_CANCELLED } from '../../../orchestration/events.js';

const emailQueue = new Queue('email', { connection: redisConnection });

const router = express.Router();

/**
 * @swagger
 * /invoices:
 *   get:
 *     tags: [Sales]
 *     summary: List invoices with pagination
 *     parameters:
 *       - in: query
 *         name: state
 *         schema: { type: string, enum: [draft, posted, cancel] }
 *       - in: query
 *         name: payment_state
 *         schema: { type: string, enum: [not_paid, partial, paid] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of invoices
 */
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
router.post('/', validate({ body: createInvoiceSchema }), asyncHandler(async (req, res) => {
  const { name, partner_id, partner_name, invoice_date, due_date, amount_total, amount_residual, state, payment_state, move_type, invoice_line_ids } = req.body;

  const lineItems = (invoice_line_ids || []).map((l: any) => ({
    product_id: l.product_id || undefined,
    description: l.product_name || '',
    quantity: l.quantity || 1,
    unit_price: l.price_unit || 0,
    total: l.price_subtotal || 0,
  }));

  const invoiceData: any = {
    name: name || `INV/${Date.now()}`,
    partner_id,
    invoice_date: invoice_date || new Date(),
    due_date: due_date || null,
    amount_total: amount_total || 0,
    amount_residual: amount_residual || amount_total || 0,
    state: state || 'draft',
    payment_state: payment_state || 'not_paid',
    move_type: move_type || 'out_invoice',
    line_items: lineItems,
  };

  if (partner_name) invoiceData.partner_name = partner_name;

  const invoice = await Invoice.create(invoiceData);

  eventBus.publish(INVOICE_CREATED, (req as any).user?.tenant_id?.toString() || '', {
    invoice_id: invoice._id.toString(),
    partner_id: invoice.partner_id?.toString(),
    amount_total: invoice.amount_total,
    tax_amount: 0,
    invoice_name: invoice.name,
  }, { user_id: (req as any).user?._id?.toString(), source: 'invoices-route' });

  res.status(201).json(invoice);
}));

// Update invoice
router.put('/:id', validate({ params: objectIdParam, body: updateInvoiceSchema }), asyncHandler(async (req, res) => {
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

// Send invoice via email
router.post('/:id/send', validate({ params: objectIdParam, body: sendInvoiceSchema }), asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('partner_id', 'name email').lean() as any;
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  const email = req.body.email || invoice.partner_id?.email;
  if (!email) {
    return res.status(400).json({ error: 'No recipient email found' });
  }

  const html = invoiceEmailTemplate({
    customerName: invoice.partner_id?.name || 'Customer',
    invoiceNumber: invoice.name || invoice.invoice_number || 'N/A',
    amount: invoice.amount_total || 0,
    dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : undefined,
  });

  await emailQueue.add('invoice-email', {
    to: email,
    subject: `Invoice ${invoice.name || invoice.invoice_number || ''}`,
    body: html,
    html,
  });

  res.json({ message: 'Invoice email queued', to: email });
}));

// Delete invoice
router.delete('/:id', asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);

  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  eventBus.publish(INVOICE_CANCELLED, (req as any).user?.tenant_id?.toString() || '', {
    invoice_id: req.params.id,
    invoice_name: invoice.name,
  }, { user_id: (req as any).user?._id?.toString(), source: 'invoices-route' });

  res.json({ message: 'Invoice deleted successfully' });
}));

export default router;
