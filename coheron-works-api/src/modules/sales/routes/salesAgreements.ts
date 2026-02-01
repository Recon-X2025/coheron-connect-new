import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { SalesAgreement } from '../models/SalesAgreement.js';

const router = express.Router();

// List agreements
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { status, agreement_type, partner_id, page = '1', limit = '20', search } = req.query;
  const filter: any = { tenant_id: tenantId };
  if (status) filter.status = status;
  if (agreement_type) filter.agreement_type = agreement_type;
  if (partner_id) filter.partner_id = partner_id;
  if (search) filter.$or = [
    { agreement_number: { $regex: search, $options: 'i' } },
    { penalty_clause: { $regex: search, $options: 'i' } },
  ];

  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [items, total] = await Promise.all([
    SalesAgreement.find(filter).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).populate('partner_id', 'name email').lean(),
    SalesAgreement.countDocuments(filter),
  ]);
  res.json({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

// Get by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const item = await SalesAgreement.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).populate('partner_id created_by').lean();
  if (!item) return res.status(404).json({ error: 'Agreement not found' });
  res.json(item);
}));

// Create
router.post('/', asyncHandler(async (req, res) => {
  const item = await SalesAgreement.create({
    ...req.body,
    tenant_id: req.user?.tenant_id,
    created_by: req.user?.userId,
  });
  res.status(201).json(item);
}));

// Update
router.put('/:id', asyncHandler(async (req, res) => {
  const item = await SalesAgreement.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true }
  );
  if (!item) return res.status(404).json({ error: 'Agreement not found' });
  res.json(item);
}));

// Delete
router.delete('/:id', asyncHandler(async (req, res) => {
  const item = await SalesAgreement.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!item) return res.status(404).json({ error: 'Agreement not found' });
  res.json({ success: true });
}));

// Get fulfillment details
router.get('/:id/fulfillment', asyncHandler(async (req, res) => {
  const item = await SalesAgreement.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!item) return res.status(404).json({ error: 'Agreement not found' });

  const report = (item.terms || []).map((term: any) => {
    const ff = (item.fulfillment || []).find((f: any) => String(f.product_id) === String(term.product_id));
    const fulfilledQty = ff?.fulfilled_quantity || 0;
    const fulfilledVal = ff?.fulfilled_value || 0;
    return {
      product_id: term.product_id,
      committed_quantity: term.committed_quantity,
      fulfilled_quantity: fulfilledQty,
      quantity_pct: term.committed_quantity > 0 ? Math.round((fulfilledQty / term.committed_quantity) * 100) : 0,
      committed_value: term.committed_value,
      fulfilled_value: fulfilledVal,
      value_pct: term.committed_value > 0 ? Math.round((fulfilledVal / term.committed_value) * 100) : 0,
    };
  });
  res.json({ agreement_id: item._id, agreement_number: item.agreement_number, fulfillment: report });
}));

// Renew agreement
router.post('/:id/renew', asyncHandler(async (req, res) => {
  const existing = await SalesAgreement.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!existing) return res.status(404).json({ error: 'Agreement not found' });

  const duration = existing.end_date.getTime() - existing.start_date.getTime();
  const newStart = new Date(existing.end_date);
  const newEnd = new Date(newStart.getTime() + duration);

  const renewed = await SalesAgreement.create({
    tenant_id: existing.tenant_id,
    agreement_number: `${existing.agreement_number}-R`,
    agreement_type: existing.agreement_type,
    partner_id: existing.partner_id,
    start_date: newStart,
    end_date: newEnd,
    terms: existing.terms,
    fulfillment: [],
    status: 'draft',
    renewal_type: existing.renewal_type,
    penalty_clause: existing.penalty_clause,
    created_by: req.user?.userId,
  });

  existing.status = 'expired';
  await existing.save();
  res.status(201).json(renewed);
}));

// Expiring agreements
router.get('/reports/expiring', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { days = '30' } = req.query;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + parseInt(days as string));

  const items = await SalesAgreement.find({
    tenant_id: tenantId,
    status: 'active',
    end_date: { $lte: futureDate, $gte: new Date() },
  }).populate('partner_id', 'name email').sort({ end_date: 1 }).lean();
  res.json(items);
}));

// Compliance report
router.get('/reports/compliance', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const agreements = await SalesAgreement.find({ tenant_id: tenantId, status: 'active' }).populate('partner_id', 'name').lean();

  const report = agreements.map((a: any) => {
    const totalCommittedQty = (a.terms || []).reduce((s: number, t: any) => s + (t.committed_quantity || 0), 0);
    const totalFulfilledQty = (a.fulfillment || []).reduce((s: number, f: any) => s + (f.fulfilled_quantity || 0), 0);
    const totalCommittedVal = (a.terms || []).reduce((s: number, t: any) => s + (t.committed_value || 0), 0);
    const totalFulfilledVal = (a.fulfillment || []).reduce((s: number, f: any) => s + (f.fulfilled_value || 0), 0);
    const daysRemaining = Math.ceil((new Date(a.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      agreement_id: a._id,
      agreement_number: a.agreement_number,
      partner: a.partner_id?.name || 'Unknown',
      quantity_compliance_pct: totalCommittedQty > 0 ? Math.round((totalFulfilledQty / totalCommittedQty) * 100) : 0,
      value_compliance_pct: totalCommittedVal > 0 ? Math.round((totalFulfilledVal / totalCommittedVal) * 100) : 0,
      days_remaining: daysRemaining,
      at_risk: daysRemaining < 30 && totalCommittedQty > 0 && (totalFulfilledQty / totalCommittedQty) < 0.7,
    };
  });
  res.json(report);
}));

export default router;
