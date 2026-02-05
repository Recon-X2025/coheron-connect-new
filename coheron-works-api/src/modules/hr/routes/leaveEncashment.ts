import express from 'express';
import { LeaveEncashment } from '../models/LeaveEncashment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// List encashment records
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.period_year) filter.period_year = parseInt(req.query.period_year as string);
  if (req.query.encashment_type) filter.encashment_type = req.query.encashment_type;
  if (req.query.status) filter.status = req.query.status;

  const records = await LeaveEncashment.find(filter)
    .populate('employee_id', 'name employee_id')
    .populate('approved_by', 'name')
    .sort({ created_at: -1 })
    .lean();

  res.json(records);
}));

// Get single record
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const record = await LeaveEncashment.findById(req.params.id)
    .populate('employee_id', 'name employee_id')
    .populate('approved_by', 'name')
    .lean();
  if (!record) return res.status(404).json({ error: 'Leave encashment record not found' });
  res.json(record);
}));

// Create encashment record
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { days_available, days_encashed, days_carried_forward, daily_rate } = req.body;

  const days_lapsed = (days_available || 0) - (days_encashed || 0) - (days_carried_forward || 0);
  const encashment_amount = (days_encashed || 0) * (daily_rate || 0);

  const record = await LeaveEncashment.create({
    ...req.body,
    days_lapsed: Math.max(0, days_lapsed),
    encashment_amount,
  });

  res.status(201).json(record);
}));

// Update encashment record
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const existing = await LeaveEncashment.findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Leave encashment record not found' });

  if (existing.status === 'processed') {
    return res.status(400).json({ error: 'Cannot update a processed record' });
  }

  // Recalculate derived fields if relevant fields changed
  const updates = { ...req.body };
  const daysAvail = updates.days_available ?? existing.days_available;
  const daysEncashed = updates.days_encashed ?? existing.days_encashed;
  const daysCarried = updates.days_carried_forward ?? existing.days_carried_forward;
  const dailyRate = updates.daily_rate ?? existing.daily_rate;

  updates.days_lapsed = Math.max(0, daysAvail - daysEncashed - daysCarried);
  updates.encashment_amount = daysEncashed * dailyRate;

  const record = await LeaveEncashment.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json(record);
}));

// Delete encashment record
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const record = await LeaveEncashment.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Leave encashment record not found' });
  if (record.status === 'processed') {
    return res.status(400).json({ error: 'Cannot delete a processed record' });
  }
  await record.deleteOne();
  res.json({ message: 'Leave encashment record deleted successfully' });
}));

// ============================================
// APPROVAL WORKFLOW
// ============================================

// Submit for approval
router.put('/:id/submit', authenticate, asyncHandler(async (req, res) => {
  const record = await LeaveEncashment.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (record.status !== 'draft') return res.status(400).json({ error: 'Only draft records can be submitted' });

  record.status = 'submitted';
  await record.save();
  res.json(record);
}));

// Approve / Reject
router.put('/:id/approve', authenticate, asyncHandler(async (req, res) => {
  const { status, approved_by } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }

  const record = await LeaveEncashment.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (record.status !== 'submitted') return res.status(400).json({ error: 'Only submitted records can be approved/rejected' });

  record.status = status;
  if (approved_by) record.approved_by = approved_by;
  await record.save();
  res.json(record);
}));

// Mark as processed (linked to payroll)
router.put('/:id/process', authenticate, asyncHandler(async (req, res) => {
  const record = await LeaveEncashment.findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (record.status !== 'approved') return res.status(400).json({ error: 'Only approved records can be processed' });

  record.status = 'processed';
  if (req.body.processed_in_payroll_id) record.processed_in_payroll_id = req.body.processed_in_payroll_id;
  await record.save();
  res.json(record);
}));

// ============================================
// BULK YEAR-END PROCESSING
// ============================================

router.post('/bulk-year-end', authenticate, asyncHandler(async (req, res) => {
  const { tenant_id, period_year, employee_ids, default_encashment_type, daily_rates } = req.body;

  if (!tenant_id || !period_year) {
    return res.status(400).json({ error: 'tenant_id and period_year are required' });
  }

  // In production, this would read actual leave balances.
  // Here we create draft records for the specified employees.
  const results: any[] = [];

  for (const empId of (employee_ids || [])) {
    try {
      // Check if record already exists
      const existing = await LeaveEncashment.findOne({
        tenant_id, employee_id: empId, period_year,
      });
      if (existing) {
        results.push({ employee_id: empId, status: 'skipped', reason: 'Record already exists' });
        continue;
      }

      const dailyRate = daily_rates?.[empId] || 0;
      const record = await LeaveEncashment.create({
        tenant_id,
        employee_id: empId,
        leave_type: 'earned_leave',
        encashment_type: default_encashment_type || 'encashment',
        period_year,
        days_available: 0, // to be filled
        days_encashed: 0,
        days_carried_forward: 0,
        days_lapsed: 0,
        encashment_amount: 0,
        daily_rate: dailyRate,
        status: 'draft',
      });

      results.push({ employee_id: empId, status: 'created', record_id: record._id });
    } catch (err: any) {
      results.push({ employee_id: empId, status: 'error', error: err.message });
    }
  }

  res.json({
    created: results.filter(r => r.status === 'created').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  });
}));

export default router;
