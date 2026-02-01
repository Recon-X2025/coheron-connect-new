import express from 'express';
import { FullFinalSettlement } from '../models/FullFinalSettlement.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// List settlements
router.get('/', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.status) filter.status = req.query.status;

  const settlements = await FullFinalSettlement.find(filter)
    .populate('employee_id', 'name employee_id department designation')
    .populate('approved_by', 'name')
    .populate('created_by', 'name')
    .sort({ created_at: -1 })
    .lean();

  res.json(settlements);
}));

// Get single settlement
router.get('/:id', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id)
    .populate('employee_id', 'name employee_id department designation date_of_joining')
    .populate('approved_by', 'name')
    .populate('created_by', 'name')
    .lean();
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  res.json(settlement);
}));

// Create settlement with auto-calculation
router.post('/', asyncHandler(async (req, res) => {
  const data = { ...req.body };

  // Generate settlement number if not provided
  if (!data.settlement_number) {
    const count = await FullFinalSettlement.countDocuments({ tenant_id: data.tenant_id });
    data.settlement_number = `FFS-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }

  // Calculate totals from components
  const components = data.components || [];
  data.total_earnings = components
    .filter((c: any) => c.type === 'earning')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  data.total_deductions = components
    .filter((c: any) => c.type === 'deduction')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  // Add leave encashment and gratuity to earnings
  data.total_earnings += (data.leave_encashment_amount || 0) + (data.gratuity_amount || 0) + (data.bonus_amount || 0);

  // Add notice period recovery to deductions
  data.total_deductions += (data.notice_period_recovery || 0);

  data.net_settlement_amount = data.total_earnings - data.total_deductions;

  const settlement = await FullFinalSettlement.create(data);
  res.status(201).json(settlement);
}));

// Update settlement
router.put('/:id', asyncHandler(async (req, res) => {
  const existing = await FullFinalSettlement.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Settlement not found' });

  if (['paid', 'cancelled'].includes(existing.status)) {
    return res.status(400).json({ error: 'Cannot update a paid or cancelled settlement' });
  }

  const data = { ...req.body };

  // Recalculate totals
  const components = data.components || existing.components;
  data.total_earnings = components
    .filter((c: any) => c.type === 'earning')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  data.total_deductions = components
    .filter((c: any) => c.type === 'deduction')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

  data.total_earnings += (data.leave_encashment_amount ?? existing.leave_encashment_amount) +
    (data.gratuity_amount ?? existing.gratuity_amount) +
    (data.bonus_amount ?? existing.bonus_amount);
  data.total_deductions += (data.notice_period_recovery ?? existing.notice_period_recovery);
  data.net_settlement_amount = data.total_earnings - data.total_deductions;

  const settlement = await FullFinalSettlement.findByIdAndUpdate(req.params.id, data, { new: true });
  res.json(settlement);
}));

// Delete settlement
router.delete('/:id', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (['paid', 'processed'].includes(settlement.status)) {
    return res.status(400).json({ error: 'Cannot delete a paid or processed settlement' });
  }
  await settlement.deleteOne();
  res.json({ message: 'Settlement deleted successfully' });
}));

// ============================================
// APPROVAL WORKFLOW
// ============================================

// Submit for approval
router.put('/:id/submit', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (settlement.status !== 'draft') return res.status(400).json({ error: 'Only draft settlements can be submitted' });

  settlement.status = 'pending_approval';
  await settlement.save();
  res.json(settlement);
}));

// Approve
router.put('/:id/approve', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (settlement.status !== 'pending_approval') return res.status(400).json({ error: 'Only pending settlements can be approved' });

  settlement.status = 'approved';
  settlement.settlement_date = new Date();
  if (req.body.approved_by) settlement.approved_by = req.body.approved_by;
  await settlement.save();
  res.json(settlement);
}));

// Reject
router.put('/:id/reject', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (settlement.status !== 'pending_approval') return res.status(400).json({ error: 'Only pending settlements can be rejected' });

  settlement.status = 'draft';
  if (req.body.remarks) settlement.remarks = req.body.remarks;
  await settlement.save();
  res.json(settlement);
}));

// Mark as processed
router.put('/:id/process', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (settlement.status !== 'approved') return res.status(400).json({ error: 'Only approved settlements can be processed' });

  settlement.status = 'processed';
  await settlement.save();
  res.json(settlement);
}));

// Mark as paid
router.put('/:id/pay', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (!['approved', 'processed'].includes(settlement.status)) {
    return res.status(400).json({ error: 'Only approved or processed settlements can be marked as paid' });
  }

  settlement.status = 'paid';
  settlement.paid_at = new Date();
  if (req.body.payment_mode) settlement.payment_mode = req.body.payment_mode;
  if (req.body.payment_reference) settlement.payment_reference = req.body.payment_reference;
  await settlement.save();
  res.json(settlement);
}));

// Cancel
router.put('/:id/cancel', asyncHandler(async (req, res) => {
  const settlement = await FullFinalSettlement.findById(req.params.id);
  if (!settlement) return res.status(404).json({ error: 'Settlement not found' });
  if (settlement.status === 'paid') return res.status(400).json({ error: 'Cannot cancel a paid settlement' });

  settlement.status = 'cancelled';
  if (req.body.remarks) settlement.remarks = req.body.remarks;
  await settlement.save();
  res.json(settlement);
}));

export default router;
