import express from 'express';
import mongoose from 'mongoose';
import AccountVendor from '../models/AccountVendor.js';
import AccountBill from '../models/AccountBill.js';
import AccountPayment from '../models/AccountPayment.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ========== VENDORS ==========

// Get all vendors
router.get('/vendors', asyncHandler(async (req, res) => {
  const { search, is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  let vendors = await AccountVendor.find(filter)
    .populate('partner_id', 'name email phone company')
    .sort({ 'partner_id.name': 1 })
    .lean();

  if (search) {
    const regex = new RegExp(search as string, 'i');
    vendors = vendors.filter((v: any) =>
      regex.test(v.partner_id?.name || '') || regex.test(v.vendor_code || '')
    );
  }

  const result = vendors.map((v: any) => ({
    ...v,
    id: v._id,
    partner_name: v.partner_id?.name || null,
    email: v.partner_id?.email || null,
    phone: v.partner_id?.phone || null,
    company: v.partner_id?.company || null,
    partner_id: v.partner_id?._id || v.partner_id,
  }));

  res.json(result);
}));

// Create vendor
router.post('/vendors', asyncHandler(async (req, res) => {
  const { partner_id, vendor_code, payment_term_id, credit_limit, tax_id, vendor_type, currency_id } = req.body;

  const vendor = await AccountVendor.create({
    partner_id,
    vendor_code,
    payment_term_id: payment_term_id || null,
    credit_limit: credit_limit || null,
    tax_id: tax_id || null,
    vendor_type: vendor_type || null,
    currency_id: currency_id || null,
  });

  res.status(201).json(vendor);
}));

// ========== BILLS (PURCHASE INVOICES) ==========

// Get all bills
router.get('/bills', asyncHandler(async (req, res) => {
  const { vendor_id, state, payment_state, date_from, date_to, search } = req.query;
  const filter: any = {};

  if (vendor_id) filter.vendor_id = vendor_id;
  if (state) filter.state = state;
  if (payment_state) filter.payment_state = payment_state;

  if (date_from || date_to) {
    filter.invoice_date = {};
    if (date_from) filter.invoice_date.$gte = new Date(date_from as string);
    if (date_to) filter.invoice_date.$lte = new Date(date_to as string);
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { reference: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    AccountBill.find(filter)
      .populate({
        path: 'vendor_id',
        select: 'vendor_code partner_id',
        populate: { path: 'partner_id', select: 'name' },
      })
      .sort({ invoice_date: -1, created_at: -1 })
      .lean(),
    pagination, filter, AccountBill
  );

  const data = paginatedResult.data.map((b: any) => ({
    ...b,
    id: b._id,
    vendor_code: b.vendor_id?.vendor_code || null,
    vendor_name: b.vendor_id?.partner_id?.name || null,
    vendor_id: b.vendor_id?._id || b.vendor_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get bill by ID with lines
router.get('/bills/:id', asyncHandler(async (req, res) => {
  const bill = await AccountBill.findById(req.params.id)
    .populate({
      path: 'vendor_id',
      select: 'vendor_code partner_id',
      populate: { path: 'partner_id', select: 'name email' },
    })
    .populate('lines.product_id', 'name default_code')
    .lean();

  if (!bill) {
    return res.status(404).json({ error: 'Bill not found' });
  }

  const result: any = {
    ...bill,
    id: bill._id,
    vendor_code: (bill.vendor_id as any)?.vendor_code || null,
    vendor_name: (bill.vendor_id as any)?.partner_id?.name || null,
    vendor_email: (bill.vendor_id as any)?.partner_id?.email || null,
    vendor_id: (bill.vendor_id as any)?._id || bill.vendor_id,
    lines: (bill.lines || []).map((l: any) => ({
      ...l,
      id: l._id,
      product_name: l.product_id?.name || null,
      product_code: l.product_id?.default_code || null,
      product_id: l.product_id?._id || l.product_id,
    })),
  };

  res.json(result);
}));

// Create bill
router.post('/bills', asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      vendor_id,
      invoice_date,
      due_date,
      reference,
      purchase_order_id,
      lines,
      currency_id,
    } = req.body;

    // Generate bill number
    const dateStr = new Date(invoice_date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `BILL/${dateStr}/${Date.now().toString().slice(-6)}`;

    // Calculate amounts
    let amountUntaxed = 0;
    let amountTax = 0;

    const billLines: any[] = [];
    if (lines && lines.length > 0) {
      for (const line of lines) {
        const lineSubtotal = parseFloat(line.price_subtotal || 0);
        amountUntaxed += lineSubtotal;
        amountTax += parseFloat(line.tax_amount || 0);
        billLines.push({
          product_id: line.product_id || null,
          name: line.name || '',
          quantity: line.quantity || 1,
          price_unit: line.price_unit || 0,
          price_subtotal: line.price_subtotal || 0,
          tax_ids: line.tax_ids || null,
          account_id: line.account_id || null,
          cost_center_id: line.cost_center_id || null,
          project_id: line.project_id || null,
        });
      }
    }

    const amountTotal = amountUntaxed + amountTax;

    const [bill] = await AccountBill.create([{
      name,
      vendor_id,
      invoice_date,
      due_date: due_date || null,
      reference: reference || null,
      purchase_order_id: purchase_order_id || null,
      amount_untaxed: amountUntaxed,
      amount_tax: amountTax,
      amount_total: amountTotal,
      amount_residual: amountTotal,
      currency_id: currency_id || null,
      state: 'draft',
      lines: billLines,
    }], { session });

    await session.commitTransaction();

    // Fetch complete bill
    const complete = await AccountBill.findById(bill._id)
      .populate({
        path: 'vendor_id',
        select: 'vendor_code partner_id',
        populate: { path: 'partner_id', select: 'name' },
      })
      .lean();

    const result: any = {
      ...complete,
      id: complete!._id,
      vendor_code: (complete!.vendor_id as any)?.vendor_code || null,
      vendor_name: (complete!.vendor_id as any)?.partner_id?.name || null,
      vendor_id: (complete!.vendor_id as any)?._id || complete!.vendor_id,
      lines: (complete!.lines || []).map((l: any) => ({ ...l, id: l._id })),
    };

    res.status(201).json(result);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Post bill (create GL entry)
router.post('/bills/:id/post', asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const billId = req.params.id;

    const bill = await AccountBill.findById(billId).session(session);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.state !== 'draft') {
      return res.status(400).json({ error: 'Bill is not in draft state' });
    }

    // TODO: Create journal entry and move lines
    bill.state = 'posted';
    await bill.save({ session });

    await session.commitTransaction();

    res.json(bill);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// ========== PAYMENTS ==========

// Get all payments
router.get('/payments', asyncHandler(async (req, res) => {
  const { payment_type, partner_id, state, date_from, date_to } = req.query;
  const filter: any = {};

  if (payment_type) filter.payment_type = payment_type;
  if (partner_id) filter.partner_id = partner_id;
  if (state) filter.state = state;

  if (date_from || date_to) {
    filter.payment_date = {};
    if (date_from) filter.payment_date.$gte = new Date(date_from as string);
    if (date_to) filter.payment_date.$lte = new Date(date_to as string);
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    AccountPayment.find(filter)
      .populate('partner_id', 'name')
      .populate('journal_id', 'name')
      .sort({ payment_date: -1 })
      .lean(),
    pagination, filter, AccountPayment
  );

  const data = paginatedResult.data.map((p: any) => ({
    ...p,
    id: p._id,
    partner_name: p.partner_id?.name || null,
    journal_name: p.journal_id?.name || null,
    partner_id: p.partner_id?._id || p.partner_id,
    journal_id: p.journal_id?._id || p.journal_id,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Create payment
router.post('/payments', asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      payment_type,
      payment_method,
      partner_id,
      amount,
      currency_id,
      payment_date,
      journal_id,
      communication,
      bill_ids,
    } = req.body;

    // Generate payment reference
    const dateStr = new Date(payment_date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `PAY/${dateStr}/${Date.now().toString().slice(-6)}`;

    const billAllocations: any[] = [];
    if (bill_ids && bill_ids.length > 0) {
      for (const billId of bill_ids) {
        billAllocations.push({
          bill_id: billId,
          amount: amount / bill_ids.length,
        });
      }
    }

    const [payment] = await AccountPayment.create([{
      name,
      payment_type,
      payment_method,
      partner_id,
      amount,
      currency_id,
      payment_date,
      journal_id,
      communication: communication || null,
      state: 'draft',
      bill_ids: billAllocations,
    }], { session });

    await session.commitTransaction();

    res.status(201).json(payment);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Post payment
router.post('/payments/:id/post', asyncHandler(async (req, res) => {
  const payment = await AccountPayment.findOneAndUpdate(
    { _id: req.params.id, state: 'draft' },
    { state: 'posted' },
    { new: true }
  );

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found or cannot be posted' });
  }

  res.json(payment);
}));

export default router;
