import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { CreditLimit } from '../models/CreditLimit.js';
import { CreditLimitLog } from '../models/CreditLimitLog.js';

const router = express.Router();

// List all credit limits
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { status, risk_rating, page = '1', limit = '20', search } = req.query;
  const filter: any = { tenant_id: tenantId };
  if (status) filter.status = status;
  if (risk_rating) filter.risk_rating = risk_rating;
  if (search) filter.$or = [{ currency: { $regex: search, $options: 'i' } }];

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [items, total] = await Promise.all([
    CreditLimit.find(filter).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).populate('partner_id', 'name email').lean(),
    CreditLimit.countDocuments(filter),
  ]);
  res.json({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// Get by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const item = await CreditLimit.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).populate('partner_id approved_by').lean();
  if (!item) return res.status(404).json({ error: 'Credit limit not found' });
  res.json(item);
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const { partner_id, credit_limit, currency, review_date, risk_rating } = req.body;
  const item = await CreditLimit.create({
    tenant_id: req.user?.tenant_id,
    partner_id,
    credit_limit,
    available_credit: credit_limit,
    current_balance: 0,
    currency,
    review_date,
    risk_rating,
    approved_by: req.user?.userId,
    approved_at: new Date(),
    status: 'active',
  });
  await CreditLimitLog.create({
    tenant_id: req.user?.tenant_id,
    partner_id,
    action: 'increase',
    previous_limit: 0,
    new_limit: credit_limit,
    reason: 'Initial credit limit setup',
    performed_by: req.user?.userId,
  });
  res.status(201).json(item);
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await CreditLimit.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!existing) return res.status(404).json({ error: 'Credit limit not found' });

  const previousLimit = existing.credit_limit;
  const { credit_limit, status, risk_rating, review_date, reason } = req.body;

  if (credit_limit !== undefined) {
    existing.credit_limit = credit_limit;
    existing.available_credit = credit_limit - existing.current_balance;
  }
  if (status) existing.status = status;
  if (risk_rating) existing.risk_rating = risk_rating;
  if (review_date) existing.review_date = review_date;
  await existing.save();

  if (credit_limit !== undefined && credit_limit !== previousLimit) {
    await CreditLimitLog.create({
      tenant_id: req.user?.tenant_id,
      partner_id: existing.partner_id,
      action: credit_limit > previousLimit ? 'increase' : 'decrease',
      previous_limit: previousLimit,
      new_limit: credit_limit,
      reason: reason || 'Limit updated',
      performed_by: req.user?.userId,
    });
  }
  res.json(existing);
}));

// Check credit for an order
router.post('/:partnerId/check', asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const cl = await CreditLimit.findOne({ partner_id: req.params.partnerId, tenant_id: req.user?.tenant_id });
  if (!cl) return res.json({ allowed: true, message: 'No credit limit set' });
  if (cl.status === 'blocked') return res.json({ allowed: false, message: 'Credit is blocked', available_credit: 0 });
  const allowed = amount <= cl.available_credit;
  res.json({ allowed, available_credit: cl.available_credit, requested: amount, message: allowed ? 'Within limit' : 'Exceeds credit limit' });
}));

// Alerts - customers near limit (>80% used)
router.get('/alerts', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const items = await CreditLimit.find({
    tenant_id: tenantId,
    status: 'active',
    $expr: { $gt: ['$current_balance', { $multiply: ['$credit_limit', 0.8] }] },
  }).populate('partner_id', 'name email').lean();
  res.json(items);
}));

export default router;
