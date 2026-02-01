import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { PaymentGateway } from '../models/PaymentGateway.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';

const router = express.Router();

// CRUD - List gateways
router.get('/', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const gateways = await PaymentGateway.find({ tenant_id }).sort({ is_default: -1, name: 1 });
  res.json(gateways);
}));

// Create gateway
router.post('/', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (req.body.is_default) {
    await PaymentGateway.updateMany({ tenant_id }, { is_default: false });
  }
  const gateway = await PaymentGateway.create({ ...req.body, tenant_id });
  res.status(201).json(gateway);
}));

// Update gateway
router.put('/:id', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  if (req.body.is_default) {
    await PaymentGateway.updateMany({ tenant_id }, { is_default: false });
  }
  const gateway = await PaymentGateway.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    req.body,
    { new: true }
  );
  if (!gateway) return res.status(404).json({ error: 'Gateway not found' });
  res.json(gateway);
}));

// Delete gateway
router.delete('/:id', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  await PaymentGateway.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Process payment
router.post('/process', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { gateway_id, amount, currency, method, order_id, tip_amount, split_payments, card_last_four, card_brand } = req.body;

  const gateway = await PaymentGateway.findOne({ _id: gateway_id, tenant_id, is_active: true });
  if (!gateway) return res.status(400).json({ error: 'Gateway not found or inactive' });

  const transaction = await PaymentTransaction.create({
    tenant_id,
    gateway_id,
    order_id,
    amount,
    currency: currency || 'USD',
    method,
    status: 'processing',
    tip_amount: tip_amount || 0,
    split_payments: split_payments || [],
    card_last_four,
    card_brand,
  });

  // Simulate gateway processing (in production, call actual gateway SDK)
  const gateway_reference = `${gateway.provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  transaction.status = 'completed';
  transaction.gateway_reference = gateway_reference;
  transaction.processed_at = new Date();
  transaction.gateway_response = { success: true, reference: gateway_reference };
  await transaction.save();

  res.json(transaction);
}));

// Refund
router.post('/refund/:transactionId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { amount, reason } = req.body;
  const txn = await PaymentTransaction.findOne({ _id: req.params.transactionId, tenant_id });
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  if (txn.status !== 'completed') return res.status(400).json({ error: 'Can only refund completed transactions' });

  const refundAmount = amount || txn.amount;
  txn.refund_amount = (txn.refund_amount || 0) + refundAmount;
  txn.refund_reason = reason;
  txn.refund_reference = `ref_${Date.now()}`;
  txn.status = txn.refund_amount >= txn.amount ? 'refunded' : 'partially_refunded';
  await txn.save();
  res.json(txn);
}));

// Void
router.post('/void/:transactionId', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const txn = await PaymentTransaction.findOne({ _id: req.params.transactionId, tenant_id });
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  txn.status = 'voided';
  await txn.save();
  res.json(txn);
}));

// List transactions
router.get('/transactions', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { status, method, gateway_id, from, to, page = '1', limit = '50' } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (gateway_id) filter.gateway_id = gateway_id;
  if (from || to) {
    filter.processed_at = {};
    if (from) filter.processed_at.$gte = new Date(from as string);
    if (to) filter.processed_at.$lte = new Date(to as string);
  }
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [transactions, total] = await Promise.all([
    PaymentTransaction.find(filter).sort({ processed_at: -1 }).skip(skip).limit(parseInt(limit as string)),
    PaymentTransaction.countDocuments(filter),
  ]);
  res.json({ transactions, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) });
}));

// Settlement report
router.get('/settlement-report', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { from, to } = req.query;
  const filter: any = { tenant_id, status: 'completed' };
  if (from || to) {
    filter.processed_at = {};
    if (from) filter.processed_at.$gte = new Date(from as string);
    if (to) filter.processed_at.$lte = new Date(to as string);
  }
  const result = await PaymentTransaction.aggregate([
    { $match: filter },
    { $group: {
      _id: { gateway_id: '$gateway_id', settled: { $cond: [{ $ifNull: ['$settled_at', false] }, 'settled', 'pending'] } },
      total_amount: { $sum: '$amount' },
      total_tips: { $sum: '$tip_amount' },
      count: { $sum: 1 },
    }},
  ]);
  res.json(result);
}));

// Reconciliation
router.get('/reconciliation', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { from, to } = req.query;
  const filter: any = { tenant_id };
  if (from || to) {
    filter.processed_at = {};
    if (from) filter.processed_at.$gte = new Date(from as string);
    if (to) filter.processed_at.$lte = new Date(to as string);
  }
  const summary = await PaymentTransaction.aggregate([
    { $match: filter },
    { $group: {
      _id: '$status',
      total_amount: { $sum: '$amount' },
      count: { $sum: 1 },
    }},
  ]);
  const unmatched = await PaymentTransaction.find({ ...filter, order_id: { $in: [null, ''] } }).limit(100);
  res.json({ summary, unmatched });
}));

export default router;
