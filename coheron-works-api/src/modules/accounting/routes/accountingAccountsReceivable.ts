import express from 'express';
import mongoose from 'mongoose';
import AccountCustomer from '../../../models/AccountCustomer.js';
import AccountReceipt from '../../../models/AccountReceipt.js';
import Invoice from '../../../models/Invoice.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ========== CUSTOMERS ==========

// Get all customers
router.get('/customers', authenticate, asyncHandler(async (req, res) => {
  const { search, is_active, credit_hold } = req.query;
  const filter: any = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  if (credit_hold !== undefined) {
    filter.credit_hold = credit_hold === 'true';
  }

  let customers = await AccountCustomer.find(filter)
    .populate('partner_id', 'name email phone company')
    .lean();

  if (search) {
    const regex = new RegExp(search as string, 'i');
    customers = customers.filter((c: any) =>
      regex.test(c.partner_id?.name || '') || regex.test(c.customer_code || '')
    );
  }

  // Calculate total outstanding per customer
  const result = await Promise.all(
    customers.map(async (c: any) => {
      const outstanding = await Invoice.aggregate([
        {
          $match: {
            partner_id: c.partner_id?._id || c.partner_id,
            payment_state: { $ne: 'paid' },
          },
        },
        { $group: { _id: null, total_outstanding: { $sum: '$amount_residual' } } },
      ]);

      return {
        ...c,
        id: c._id,
        partner_name: c.partner_id?.name || null,
        email: c.partner_id?.email || null,
        phone: c.partner_id?.phone || null,
        company: c.partner_id?.company || null,
        partner_id: c.partner_id?._id || c.partner_id,
        total_outstanding: outstanding[0]?.total_outstanding || 0,
      };
    })
  );

  // Sort by partner_name
  result.sort((a, b) => (a.partner_name || '').localeCompare(b.partner_name || ''));

  res.json(result);
}));

// Get customer aging
router.get('/customers/:id/aging', authenticate, asyncHandler(async (req, res) => {
  const customer = await AccountCustomer.findById(req.params.id).lean();

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const partnerId = customer.partner_id;
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const invoices = await Invoice.find({
    partner_id: partnerId,
    payment_state: { $ne: 'paid' },
    amount_residual: { $gt: 0 },
  })
    .sort({ due_date: 1 })
    .lean();

  const result = invoices.map((inv: any) => {
    const dueDate = new Date(inv.due_date);
    let aging_bucket = 'current';
    if (dueDate < d90) aging_bucket = 'over_90';
    else if (dueDate < d60) aging_bucket = '60_90';
    else if (dueDate < d30) aging_bucket = '30_60';
    else if (dueDate < now) aging_bucket = '0_30';

    return {
      invoice_date: inv.invoice_date,
      invoice_number: inv.name,
      amount_total: inv.amount_total,
      amount_residual: inv.amount_residual,
      due_date: inv.due_date,
      aging_bucket,
    };
  });

  res.json(result);
}));

// ========== RECEIPTS ==========

// Get all receipts
router.get('/receipts', authenticate, asyncHandler(async (req, res) => {
  const { customer_id, invoice_id, state, date_from, date_to } = req.query;
  const filter: any = {};

  if (customer_id) filter.customer_id = customer_id;
  if (invoice_id) filter.invoice_id = invoice_id;
  if (state) filter.state = state;

  if (date_from || date_to) {
    filter.payment_date = {};
    if (date_from) filter.payment_date.$gte = new Date(date_from as string);
    if (date_to) filter.payment_date.$lte = new Date(date_to as string);
  }

  const receipts = await AccountReceipt.find(filter)
    .populate({
      path: 'customer_id',
      select: 'customer_code partner_id',
      populate: { path: 'partner_id', select: 'name' },
    })
    .sort({ payment_date: -1 })
    .lean();

  const result = await Promise.all(
    receipts.map(async (r: any) => {
      let invoice_number = null;
      if (r.invoice_id) {
        const inv = await Invoice.findById(r.invoice_id).select('name').lean() as any;
        invoice_number = inv?.name || null;
      }
      return {
        ...r,
        id: r._id,
        customer_code: r.customer_id?.customer_code || null,
        customer_name: r.customer_id?.partner_id?.name || null,
        invoice_number,
        customer_id: r.customer_id?._id || r.customer_id,
      };
    })
  );

  res.json(result);
}));

// Get receipt by ID
router.get('/receipts/:id', authenticate, asyncHandler(async (req, res) => {
  const receipt = await AccountReceipt.findById(req.params.id)
    .populate({
      path: 'customer_id',
      select: 'customer_code partner_id',
      populate: { path: 'partner_id', select: 'name' },
    })
    .lean();

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }

  // Get linked invoices details
  const invoices = await Promise.all(
    ((receipt as any).invoice_allocations || []).map(async (rel: any) => {
      const inv = await Invoice.findById(rel.invoice_id)
        .select('name amount_total amount_residual')
        .lean() as any;
      return {
        invoice_id: rel.invoice_id,
        amount: rel.amount,
        invoice_number: inv?.name || null,
        amount_total: inv?.amount_total || 0,
        amount_residual: inv?.amount_residual || 0,
      };
    })
  );

  const result = {
    ...receipt,
    id: (receipt as any)._id,
    customer_code: (receipt as any).customer_id?.customer_code || null,
    customer_name: (receipt as any).customer_id?.partner_id?.name || null,
    customer_id: (receipt as any).customer_id?._id || receipt.customer_id,
    invoices,
  };

  res.json(result);
}));

// Create receipt
router.post('/receipts', authenticate, asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      customer_id,
      invoice_id,
      amount,
      currency_id,
      payment_date,
      payment_method,
      journal_id,
      communication,
      invoice_ids,
    } = req.body;

    // Generate receipt number
    const dateStr = new Date(payment_date).toISOString().slice(0, 10).replace(/-/g, '');
    const name = `REC/${dateStr}/${Date.now().toString().slice(-6)}`;

    const invoiceAllocations: any[] = [];

    // Link to invoices if provided
    if (invoice_ids && invoice_ids.length > 0) {
      let remainingAmount = amount;
      for (const invId of invoice_ids) {
        const inv = await Invoice.findById(invId).session(session);

        if (inv) {
          const invoiceResidual = inv.amount_residual || 0;
          const applyAmount = Math.min(remainingAmount, invoiceResidual);

          invoiceAllocations.push({
            invoice_id: invId,
            amount: applyAmount,
          });

          // Update invoice residual
          inv.amount_residual = inv.amount_residual - applyAmount;
          inv.payment_state = inv.amount_residual <= 0 ? 'paid' : 'partial';
          await inv.save({ session });

          remainingAmount -= applyAmount;
          if (remainingAmount <= 0) break;
        }
      }
    }

    const [receipt] = await AccountReceipt.create([{
      name,
      customer_id,
      invoice_id: invoice_id || null,
      amount,
      currency_id: currency_id || null,
      payment_date,
      payment_method: payment_method || 'bank_transfer',
      journal_id: journal_id || null,
      communication: communication || null,
      state: 'draft',
      invoice_allocations: invoiceAllocations,
    }], { session });

    await session.commitTransaction();

    res.status(201).json(receipt);
  } catch (error: any) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}));

// Post receipt
router.post('/receipts/:id/post', authenticate, asyncHandler(async (req, res) => {
  const receipt = await AccountReceipt.findOneAndUpdate(
    { _id: req.params.id, state: 'draft' },
    { state: 'posted' },
    { new: true }
  );

  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found or cannot be posted' });
  }

  res.json(receipt);
}));

// ========== AR AGING REPORT ==========

router.get('/aging', authenticate, asyncHandler(async (req, res) => {
  const { date_as_of } = req.query;
  const asOfDate = date_as_of ? new Date(date_as_of as string) : new Date();
  const d30 = new Date(asOfDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d60 = new Date(asOfDate.getTime() - 60 * 24 * 60 * 60 * 1000);
  const d90 = new Date(asOfDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  const invoices = await Invoice.find({
    payment_state: { $ne: 'paid' },
    amount_residual: { $gt: 0 },
    move_type: 'out_invoice',
  })
    .populate('partner_id', 'name')
    .sort({ due_date: 1 })
    .lean();

  const result = invoices.map((inv: any) => {
    const dueDate = new Date(inv.due_date);
    let aging_bucket = 'current';
    let over_90 = 0, days_60_90 = 0, days_30_60 = 0, days_0_30 = 0, current = 0;

    if (dueDate < d90) {
      aging_bucket = 'over_90';
      over_90 = inv.amount_residual;
    } else if (dueDate < d60) {
      aging_bucket = '60_90';
      days_60_90 = inv.amount_residual;
    } else if (dueDate < d30) {
      aging_bucket = '30_60';
      days_30_60 = inv.amount_residual;
    } else if (dueDate < asOfDate) {
      aging_bucket = '0_30';
      days_0_30 = inv.amount_residual;
    } else {
      current = inv.amount_residual;
    }

    return {
      partner_id: inv.partner_id?._id || inv.partner_id,
      customer_name: inv.partner_id?.name || null,
      invoice_number: inv.name,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      amount_total: inv.amount_total,
      amount_residual: inv.amount_residual,
      aging_bucket,
      over_90,
      days_60_90,
      days_30_60,
      days_0_30,
      current,
    };
  });

  res.json(result);
}));

export default router;
