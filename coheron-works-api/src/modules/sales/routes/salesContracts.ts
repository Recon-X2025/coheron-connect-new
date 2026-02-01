import express from 'express';
import { Contract, Sla, SlaPerformance, Subscription, UsageBillingRule } from '../../../models/Contract.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// CONTRACTS
// ============================================

// Get all contracts
router.get('/', asyncHandler(async (req, res) => {
  const { partner_id, status, contract_type } = req.query;
  const filter: any = {};

  if (partner_id) filter.partner_id = partner_id;
  if (status) filter.status = status;
  if (contract_type) filter.contract_type = contract_type;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Contract.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, Contract
  );

  res.json(paginatedResult);
}));

// Get contract by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const contract = await Contract.findById(req.params.id).lean();

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  const slas = await Sla.find({ contract_id: req.params.id }).lean();

  res.json({
    ...contract,
    slas,
  });
}));

// Create contract
router.post('/', asyncHandler(async (req, res) => {
  const {
    contract_number, partner_id, contract_type, start_date, end_date,
    renewal_date, auto_renew, billing_cycle, contract_value, currency,
    terms_and_conditions, contract_lines,
  } = req.body;

  let finalContractNumber = contract_number;
  if (!finalContractNumber) {
    const count = await Contract.countDocuments();
    finalContractNumber = `CNT-${String(count + 1).padStart(6, '0')}`;
  }

  const lines = (contract_lines || []).map((line: any) => ({
    product_id: line.product_id,
    product_name: line.product_name,
    quantity: line.quantity || 1,
    unit_price: line.unit_price,
    total_price: line.total_price || line.unit_price * (line.quantity || 1),
    billing_frequency: line.billing_frequency || billing_cycle,
  }));

  const contract = await Contract.create({
    contract_number: finalContractNumber,
    partner_id,
    contract_type,
    start_date,
    end_date,
    renewal_date,
    auto_renew: auto_renew || false,
    billing_cycle: billing_cycle || 'monthly',
    contract_value,
    currency: currency || 'INR',
    terms_and_conditions,
    contract_lines: lines,
  });

  res.status(201).json(contract);
}));

// Update contract
router.put('/:id', asyncHandler(async (req, res) => {
  const { status, end_date, renewal_date, auto_renew, signed_at, signed_by, esign_document_id } = req.body;

  const updateData: any = {};
  if (status !== undefined) updateData.status = status;
  if (end_date !== undefined) updateData.end_date = end_date;
  if (renewal_date !== undefined) updateData.renewal_date = renewal_date;
  if (auto_renew !== undefined) updateData.auto_renew = auto_renew;
  if (signed_at !== undefined) updateData.signed_at = signed_at;
  if (signed_by !== undefined) updateData.signed_by = signed_by;
  if (esign_document_id !== undefined) updateData.esign_document_id = esign_document_id;

  const contract = await Contract.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  res.json(contract);
}));

// Renew contract
router.post('/:id/renew', asyncHandler(async (req, res) => {
  const { new_end_date, new_renewal_date } = req.body;

  const oldContract = await Contract.findById(req.params.id);
  if (!oldContract) {
    return res.status(404).json({ error: 'Contract not found' });
  }

  // Update old contract status
  await Contract.findByIdAndUpdate(req.params.id, { status: 'renewed' });

  const old = oldContract.toJSON() as any;

  // Create new contract
  const newContractNumber = `${old.contract_number}-RENEW-${Date.now()}`;

  const newLines = (old.contract_lines || []).map((line: any) => ({
    product_id: line.product_id,
    product_name: line.product_name,
    quantity: line.quantity,
    unit_price: line.unit_price,
    total_price: line.total_price,
    billing_frequency: line.billing_frequency,
  }));

  const newContract = await Contract.create({
    contract_number: newContractNumber,
    partner_id: old.partner_id,
    contract_type: old.contract_type,
    start_date: old.end_date || new Date(),
    end_date: new_end_date,
    renewal_date: new_renewal_date,
    auto_renew: old.auto_renew,
    billing_cycle: old.billing_cycle,
    contract_value: old.contract_value,
    currency: old.currency,
    terms_and_conditions: old.terms_and_conditions,
    status: 'active',
    contract_lines: newLines,
  });

  res.json(newContract);
}));

// ============================================
// SLAs (Service Level Agreements)
// ============================================

// Get SLAs for contract
router.get('/:id/slas', asyncHandler(async (req, res) => {
  const slas = await Sla.find({ contract_id: req.params.id }).sort({ created_at: -1 }).lean();

  const result = await Promise.all(slas.map(async (s: any) => {
    const recentPerformance = await SlaPerformance.find({ sla_id: s._id })
      .sort({ measurement_date: -1 })
      .limit(10)
      .lean();
    return { ...s, recent_performance: recentPerformance };
  }));

  res.json(result);
}));

// Create SLA
router.post('/:id/slas', asyncHandler(async (req, res) => {
  const { name, sla_type, target_value, unit, penalty_per_violation, credit_per_violation, measurement_period } = req.body;

  const sla = await Sla.create({
    name,
    contract_id: req.params.id,
    sla_type,
    target_value,
    unit,
    penalty_per_violation: penalty_per_violation || 0,
    credit_per_violation: credit_per_violation || 0,
    measurement_period: measurement_period || 'monthly',
  });

  res.status(201).json(sla);
}));

// Record SLA performance
router.post('/slas/:slaId/performance', asyncHandler(async (req, res) => {
  const { measurement_date, actual_value, target_value, is_violated, violation_count, penalty_applied, credit_applied } = req.body;

  const sla: any = await Sla.findById(req.params.slaId).lean();
  if (!sla) {
    return res.status(404).json({ error: 'SLA not found' });
  }

  const performance = await SlaPerformance.findOneAndUpdate(
    { sla_id: req.params.slaId, measurement_date },
    {
      sla_id: req.params.slaId,
      contract_id: sla.contract_id,
      measurement_date,
      actual_value,
      target_value: target_value || sla.target_value,
      is_violated: is_violated || false,
      violation_count: violation_count || 0,
      penalty_applied: penalty_applied || 0,
      credit_applied: credit_applied || 0,
    },
    { upsert: true, new: true }
  );

  res.status(201).json(performance);
}));

// ============================================
// SUBSCRIPTIONS
// ============================================

// Get all subscriptions
router.get('/subscriptions', asyncHandler(async (req, res) => {
  const { partner_id, status } = req.query;
  const filter: any = {};

  if (partner_id) filter.partner_id = partner_id;
  if (status) filter.status = status;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Subscription.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, Subscription
  );

  res.json(paginatedResult);
}));

// Create subscription
router.post('/subscriptions', asyncHandler(async (req, res) => {
  const {
    subscription_number, contract_id, partner_id, product_id,
    subscription_plan, billing_cycle, unit_price, quantity,
    start_date, end_date, auto_renew,
  } = req.body;

  let finalSubscriptionNumber = subscription_number;
  if (!finalSubscriptionNumber) {
    const count = await Subscription.countDocuments();
    finalSubscriptionNumber = `SUB-${String(count + 1).padStart(6, '0')}`;
  }

  const start = new Date(start_date);
  let nextBillingDate = new Date(start);
  if (billing_cycle === 'monthly') {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
  } else if (billing_cycle === 'quarterly') {
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
  } else if (billing_cycle === 'yearly') {
    nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
  }

  const subscription = await Subscription.create({
    subscription_number: finalSubscriptionNumber,
    contract_id,
    partner_id,
    product_id,
    subscription_plan,
    billing_cycle,
    unit_price,
    quantity: quantity || 1,
    total_price: unit_price * (quantity || 1),
    start_date,
    end_date,
    next_billing_date: nextBillingDate,
    auto_renew: auto_renew !== false,
  });

  res.status(201).json(subscription);
}));

// Cancel subscription
router.post('/subscriptions/:id/cancel', asyncHandler(async (req, res) => {
  const { cancellation_reason } = req.body;

  const subscription = await Subscription.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled', cancellation_reason, cancelled_at: new Date() },
    { new: true }
  );

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  res.json(subscription);
}));

// Usage-based billing rules
router.post('/subscriptions/:id/usage-rules', asyncHandler(async (req, res) => {
  const { metric_name, unit_price, included_units, overage_price, billing_frequency } = req.body;

  const rule = await UsageBillingRule.create({
    subscription_id: req.params.id,
    metric_name,
    unit_price,
    included_units: included_units || 0,
    overage_price,
    billing_frequency: billing_frequency || 'monthly',
  });

  res.status(201).json(rule);
}));

export default router;
