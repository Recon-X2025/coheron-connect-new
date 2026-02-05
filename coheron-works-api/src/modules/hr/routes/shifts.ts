import express from 'express';
import Shift from '../../../models/Shift.js';
import ShiftAssignment from '../../../models/ShiftAssignment.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET / - List shifts
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const shifts = await Shift.find({ tenant_id: (req as any).user?.tenant_id });
  res.json(shifts);
}));

// POST / - Create shift
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const shift = new Shift({ ...req.body, tenant_id: (req as any).user?.tenant_id });
  await shift.save();
  res.status(201).json(shift);
}));

// PUT /:id - Update shift
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const shift = await Shift.findOneAndUpdate(
    { _id: req.params.id, tenant_id: (req as any).user?.tenant_id },
    req.body,
    { new: true }
  );
  if (!shift) return res.status(404).json({ error: 'Shift not found' });
  res.json(shift);
}));

// GET /assignments - List shift assignments
router.get('/assignments', authenticate, asyncHandler(async (req, res) => {
  const { employee_id, from_date, to_date } = req.query;
  const filter: any = { tenant_id: (req as any).user?.tenant_id };
  if (employee_id) filter.employee_id = employee_id;
  if (from_date && to_date) filter.start_date = { $gte: new Date(from_date as string), $lte: new Date(to_date as string) };
  const assignments = await ShiftAssignment.find(filter).populate('employee_id shift_id').sort({ start_date: -1 });
  res.json(assignments);
}));

// POST /assignments - Assign shift to employee(s)
router.post('/assignments', authenticate, asyncHandler(async (req, res) => {
  const { employee_ids, shift_id, start_date, end_date, is_recurring, recurrence_pattern, custom_days } = req.body;
  const ids = Array.isArray(employee_ids) ? employee_ids : [employee_ids];
  const assignments = await ShiftAssignment.insertMany(ids.map((eid: string) => ({
    tenant_id: (req as any).user?.tenant_id,
    employee_id: eid,
    shift_id,
    start_date,
    end_date,
    is_recurring: is_recurring || false,
    recurrence_pattern: recurrence_pattern || 'daily',
    custom_days: custom_days || [],
    created_by: (req as any).user?._id,
  })));
  res.status(201).json(assignments);
}));

// POST /assignments/:id/swap - Request shift swap
router.post('/assignments/:id/swap', authenticate, asyncHandler(async (req, res) => {
  const { swap_with_employee_id } = req.body;
  const assignment = await ShiftAssignment.findOneAndUpdate(
    { _id: req.params.id, tenant_id: (req as any).user?.tenant_id, status: 'active' },
    { swapped_with_employee_id: swap_with_employee_id, status: 'swapped', notes: 'Swap requested' },
    { new: true }
  );
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  res.json(assignment);
}));

// POST /assignments/:id/approve-swap - Approve swap request
router.post('/assignments/:id/approve-swap', authenticate, asyncHandler(async (req, res) => {
  const assignment = await ShiftAssignment.findOneAndUpdate(
    { _id: req.params.id, tenant_id: (req as any).user?.tenant_id, status: 'swapped' },
    { notes: 'Swap approved' },
    { new: true }
  );
  if (!assignment) return res.status(404).json({ error: 'Assignment not found or not in swap state' });
  res.json(assignment);
}));

export default router;
