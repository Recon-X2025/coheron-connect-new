import express from 'express';
import { Attendance } from '../../../models/Attendance.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get attendance records
router.get('/', asyncHandler(async (req, res) => {
  const { employee_id, date, from_date, to_date } = req.query;
  const filter: any = {};

  if (employee_id) {
    filter.employee_id = employee_id;
  }
  if (date) {
    filter.date = date;
  }
  if (from_date && to_date) {
    filter.date = { $gte: from_date, $lte: to_date };
  }

  const records = await Attendance.find(filter)
    .populate('employee_id', 'name employee_id')
    .sort({ date: -1 });

  // Map to match original response shape with employee_name and emp_id
  const result = records.map((r: any) => {
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

// Create/Update attendance record
router.post('/', asyncHandler(async (req, res) => {
  const { employee_id, date, check_in, check_out, hours_worked, status } = req.body;

  const record = await Attendance.findOneAndUpdate(
    { employee_id, date },
    { employee_id, date, check_in, check_out, hours_worked, status },
    { upsert: true, new: true }
  );

  res.status(201).json(record);
}));

export default router;
