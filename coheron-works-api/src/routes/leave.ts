import express from 'express';
import { LeaveRequest, LeaveBalance } from '../models/Leave.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';
import { LeaveType } from '../models/LeaveType.js';
import { LeavePolicy } from '../models/LeavePolicy.js';
import { HolidayCalendar } from '../models/HolidayCalendar.js';

const router = express.Router();

// Get leave requests
router.get('/requests', asyncHandler(async (req, res) => {
  const { employee_id, status } = req.query;
  const filter: any = {};

  if (employee_id) {
    filter.employee_id = employee_id;
  }
  if (status) {
    filter.status = status;
  }

  const requests = await LeaveRequest.find(filter)
    .populate('employee_id', 'name employee_id')
    .sort({ created_at: -1 });

  const result = requests.map((r: any) => {
    const obj = r.toJSON();
    if (obj.employee_id && typeof obj.employee_id === 'object') {
      obj.employee_name = obj.employee_id.name;
      obj.emp_id = obj.employee_id.employee_id;
      obj.employee_id = obj.employee_id._id;
    }
    return obj;
  });

  res.json(result);
}));

// Create leave request
router.post('/requests', asyncHandler(async (req, res) => {
  const { employee_id, leave_type, from_date, to_date, days, reason, contact_during_leave } = req.body;

  const request = await LeaveRequest.create({
    employee_id, leave_type, from_date, to_date, days, reason, contact_during_leave
  });

  res.status(201).json(request);
}));

// Approve/Reject leave request
router.put('/requests/:id/approve', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, approved_by } = req.body;

  const request = await LeaveRequest.findByIdAndUpdate(
    id,
    { status, approved_by, approved_at: new Date() },
    { new: true }
  );

  if (!request) {
    return res.status(404).json({ error: 'Leave request not found' });
  }
  res.json(request);
}));

// Get leave balance
router.get('/balance/:employee_id', asyncHandler(async (req, res) => {
  const { employee_id } = req.params;
  const { year } = req.query;
  const currentYear = year || new Date().getFullYear();

  const balances = await LeaveBalance.find({
    employee_id,
    year: currentYear,
  }).lean();

  res.json(balances);
}));

// ============================================
// LEAVE TYPES
// ============================================

router.get('/types', asyncHandler(async (req, res) => {
  const types = await LeaveType.find(req.query.tenant_id ? { tenant_id: req.query.tenant_id } : {}).lean();
  res.json(types);
}));

router.post('/types', asyncHandler(async (req, res) => {
  const type = await LeaveType.create(req.body);
  res.status(201).json(type);
}));

router.put('/types/:id', asyncHandler(async (req, res) => {
  const type = await LeaveType.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!type) return res.status(404).json({ error: 'Leave type not found' });
  res.json(type);
}));

router.delete('/types/:id', asyncHandler(async (req, res) => {
  const type = await LeaveType.findByIdAndDelete(req.params.id);
  if (!type) return res.status(404).json({ error: 'Leave type not found' });
  res.json({ message: 'Leave type deleted successfully' });
}));

// ============================================
// LEAVE POLICIES
// ============================================

router.get('/policies', asyncHandler(async (req, res) => {
  const policies = await LeavePolicy.find(req.query.tenant_id ? { tenant_id: req.query.tenant_id } : {}).populate('allocations.leave_type_id', 'name code').lean();
  res.json(policies);
}));

router.post('/policies', asyncHandler(async (req, res) => {
  const policy = await LeavePolicy.create(req.body);
  res.status(201).json(policy);
}));

router.put('/policies/:id', asyncHandler(async (req, res) => {
  const policy = await LeavePolicy.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!policy) return res.status(404).json({ error: 'Leave policy not found' });
  res.json(policy);
}));

router.delete('/policies/:id', asyncHandler(async (req, res) => {
  const policy = await LeavePolicy.findByIdAndDelete(req.params.id);
  if (!policy) return res.status(404).json({ error: 'Leave policy not found' });
  res.json({ message: 'Leave policy deleted successfully' });
}));

// ============================================
// HOLIDAY CALENDARS
// ============================================

router.get('/holidays', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.year) filter.year = req.query.year;
  const calendars = await HolidayCalendar.find(filter).lean();
  res.json(calendars);
}));

router.post('/holidays', asyncHandler(async (req, res) => {
  const calendar = await HolidayCalendar.create(req.body);
  res.status(201).json(calendar);
}));

router.put('/holidays/:id', asyncHandler(async (req, res) => {
  const calendar = await HolidayCalendar.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!calendar) return res.status(404).json({ error: 'Holiday calendar not found' });
  res.json(calendar);
}));

router.delete('/holidays/:id', asyncHandler(async (req, res) => {
  const calendar = await HolidayCalendar.findByIdAndDelete(req.params.id);
  if (!calendar) return res.status(404).json({ error: 'Holiday calendar not found' });
  res.json({ message: 'Holiday calendar deleted successfully' });
}));

export default router;
