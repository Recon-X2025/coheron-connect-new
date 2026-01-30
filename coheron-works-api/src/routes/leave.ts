import express from 'express';
import { LeaveRequest, LeaveBalance } from '../models/Leave.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

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

export default router;
