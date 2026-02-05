import express from 'express';
import { Employee } from '../../../models/Employee.js';
import { Payslip } from '../../../models/Payroll.js';
import { LeaveRequest } from '../../../models/Leave.js';
import { Attendance } from '../../../models/Attendance.js';
import MobileCheckin from '../../../models/MobileCheckin.js';
import Geofence from '../../../models/Geofence.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /profile - Get current employee's profile
router.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee profile not found' });
  res.json(employee);
}));

// PUT /profile - Update allowed fields
router.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { phone, emergency_contact, address, photo } = req.body;
  const employee = await Employee.findOneAndUpdate(
    { user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id },
    { $set: { phone, emergency_contact, address, photo } },
    { new: true }
  );
  if (!employee) return res.status(404).json({ error: 'Employee profile not found' });
  res.json(employee);
}));

// GET /payslips - Get own payslips
router.get('/payslips', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const payslips = await Payslip.find({ employee_id: employee._id, tenant_id: (req as any).user?.tenant_id }).sort({ pay_period_end: -1 });
  res.json(payslips);
}));

// GET /payslips/:id/download - Download payslip PDF
router.get('/payslips/:id/download', authenticate, asyncHandler(async (req, res) => {
  const payslip = await Payslip.findById(req.params.id);
  if (!payslip) return res.status(404).json({ error: 'Payslip not found' });
  res.json({ message: 'PDF download endpoint - integrate with PDF service', payslip_id: req.params.id });
}));

// GET /leaves - Get own leave balance and history
router.get('/leaves', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const leaves = await LeaveRequest.find({ employee_id: employee._id, tenant_id: (req as any).user?.tenant_id }).sort({ start_date: -1 });
  res.json(leaves);
}));

// POST /leaves/apply - Apply for leave
router.post('/leaves/apply', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const leave = new LeaveRequest({ ...req.body, employee_id: employee._id, tenant_id: (req as any).user?.tenant_id, status: 'pending' });
  await leave.save();
  res.status(201).json(leave);
}));

// POST /leaves/:id/cancel - Cancel own leave request
router.post('/leaves/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findOneAndUpdate(
    { _id: req.params.id, tenant_id: (req as any).user?.tenant_id, status: 'pending' },
    { status: 'cancelled' },
    { new: true }
  );
  if (!leave) return res.status(404).json({ error: 'Leave not found or cannot be cancelled' });
  res.json(leave);
}));

// GET /attendance - Get own attendance records
router.get('/attendance', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const { from_date, to_date } = req.query;
  const filter: any = { employee_id: employee._id, tenant_id: (req as any).user?.tenant_id };
  if (from_date && to_date) filter.date = { $gte: from_date, $lte: to_date };
  const records = await Attendance.find(filter).sort({ date: -1 });
  res.json(records);
}));

// POST /checkin - Mobile check-in with GPS
router.post('/checkin', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const { latitude, longitude, accuracy_meters, address, device_info, photo_url, notes } = req.body;
  let is_within_geofence = false;
  let geofence_id;
  const geofences = await Geofence.find({ tenant_id: (req as any).user?.tenant_id, is_active: true });
  for (const gf of geofences) {
    const dist = Math.sqrt(Math.pow((gf.latitude - latitude) * 111320, 2) + Math.pow((gf.longitude - longitude) * 111320 * Math.cos(gf.latitude * Math.PI / 180), 2));
    if (dist <= gf.radius_meters) { is_within_geofence = true; geofence_id = gf._id; break; }
  }
  const checkin = new MobileCheckin({ tenant_id: (req as any).user?.tenant_id, employee_id: employee._id, checkin_type: 'in', timestamp: new Date(), latitude, longitude, accuracy_meters, address, device_info, photo_url, is_within_geofence, geofence_id, notes });
  await checkin.save();
  res.status(201).json(checkin);
}));

// POST /checkout - Mobile check-out
router.post('/checkout', authenticate, asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({ user_id: (req as any).user?._id, tenant_id: (req as any).user?.tenant_id });
  if (!employee) return res.status(404).json({ error: 'Employee not found' });
  const { latitude, longitude, accuracy_meters, address, device_info, photo_url, notes } = req.body;
  const checkin = new MobileCheckin({ tenant_id: (req as any).user?.tenant_id, employee_id: employee._id, checkin_type: 'out', timestamp: new Date(), latitude, longitude, accuracy_meters, address, device_info, photo_url, notes });
  await checkin.save();
  res.status(201).json(checkin);
}));

export default router;
