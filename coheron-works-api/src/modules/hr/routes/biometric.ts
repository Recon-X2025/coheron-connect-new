import express from 'express';
import { BiometricDevice } from '../models/BiometricDevice.js';
import { BiometricPunch } from '../models/BiometricPunch.js';
import { Attendance } from '../../../models/Attendance.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// BIOMETRIC DEVICES
// ============================================

// List devices
router.get('/devices', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.protocol) filter.protocol = req.query.protocol;

  const devices = await BiometricDevice.find(filter).sort({ created_at: -1 }).lean();
  res.json(devices);
}));

// Get single device
router.get('/devices/:id', asyncHandler(async (req, res) => {
  const device = await BiometricDevice.findById(req.params.id).lean();
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
}));

// Create device
router.post('/devices', asyncHandler(async (req, res) => {
  const device = await BiometricDevice.create(req.body);
  res.status(201).json(device);
}));

// Update device
router.put('/devices/:id', asyncHandler(async (req, res) => {
  const device = await BiometricDevice.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
}));

// Delete device
router.delete('/devices/:id', asyncHandler(async (req, res) => {
  const device = await BiometricDevice.findByIdAndDelete(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ message: 'Device deleted successfully' });
}));

// ============================================
// SYNC
// ============================================

// Trigger sync for a device (simulated — real integration depends on SDK)
router.post('/devices/:id/sync', asyncHandler(async (req, res) => {
  const device = await BiometricDevice.findById(req.params.id);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  // In production, this would connect to the device via its protocol
  // and pull punch records. Here we update the sync timestamp.
  device.last_sync_at = new Date();
  device.status = 'active';
  await device.save();

  res.json({ message: 'Sync initiated successfully', last_sync_at: device.last_sync_at });
}));

// Bulk sync all auto-sync devices
router.post('/sync-all', asyncHandler(async (req, res) => {
  const filter: any = { auto_sync: true, status: { $in: ['active', 'offline'] } };
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;

  const devices = await BiometricDevice.find(filter);
  const results: any[] = [];

  for (const device of devices) {
    try {
      device.last_sync_at = new Date();
      device.status = 'active';
      await device.save();
      results.push({ device_id: device._id, device_name: device.device_name, status: 'synced' });
    } catch (err: any) {
      results.push({ device_id: device._id, device_name: device.device_name, status: 'failed', error: err.message });
    }
  }

  res.json({ synced: results.filter(r => r.status === 'synced').length, failed: results.filter(r => r.status === 'failed').length, results });
}));

// ============================================
// PUNCH LOGS
// ============================================

// List punches
router.get('/punches', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.employee_id) filter.employee_id = req.query.employee_id;
  if (req.query.device_id) filter.device_id = req.query.device_id;
  if (req.query.synced !== undefined) filter.synced = req.query.synced === 'true';
  if (req.query.from_date || req.query.to_date) {
    filter.punch_time = {};
    if (req.query.from_date) filter.punch_time.$gte = new Date(req.query.from_date as string);
    if (req.query.to_date) filter.punch_time.$lte = new Date(req.query.to_date as string);
  }

  const punches = await BiometricPunch.find(filter)
    .populate('employee_id', 'name employee_id')
    .populate('device_id', 'device_name location')
    .sort({ punch_time: -1 })
    .limit(parseInt(req.query.limit as string) || 500)
    .lean();

  res.json(punches);
}));

// Manual punch entry
router.post('/punches', asyncHandler(async (req, res) => {
  const punch = await BiometricPunch.create({
    ...req.body,
    synced: true, // manual entries are considered synced
  });
  res.status(201).json(punch);
}));

// Delete a punch record
router.delete('/punches/:id', asyncHandler(async (req, res) => {
  const punch = await BiometricPunch.findByIdAndDelete(req.params.id);
  if (!punch) return res.status(404).json({ error: 'Punch record not found' });
  res.json({ message: 'Punch record deleted successfully' });
}));

// ============================================
// LINK PUNCHES TO ATTENDANCE
// ============================================

// Process unlinked punches and create/update attendance records
router.post('/link-attendance', asyncHandler(async (req, res) => {
  const filter: any = { attendance_linked: false };
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.date) {
    const date = new Date(req.query.date as string);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    filter.punch_time = { $gte: date, $lt: nextDate };
  }

  const punches = await BiometricPunch.find(filter).sort({ employee_id: 1, punch_time: 1 });

  // Group punches by employee and date
  const grouped: Record<string, any[]> = {};
  for (const punch of punches) {
    const dateKey = punch.punch_time.toISOString().split('T')[0];
    const key = `${punch.employee_id}_${dateKey}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(punch);
  }

  let linked = 0;
  for (const [key, dayPunches] of Object.entries(grouped)) {
    const [employeeId, date] = key.split('_');
    const checkIns = dayPunches.filter(p => p.punch_type === 'check_in');
    const checkOuts = dayPunches.filter(p => p.punch_type === 'check_out');

    const firstIn = checkIns.length > 0 ? checkIns[0].punch_time : dayPunches[0].punch_time;
    const lastOut = checkOuts.length > 0 ? checkOuts[checkOuts.length - 1].punch_time : null;

    let hoursWorked = 0;
    if (firstIn && lastOut) {
      hoursWorked = Math.round(((lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60)) * 100) / 100;
    }

    await Attendance.findOneAndUpdate(
      { employee_id: employeeId, date },
      {
        employee_id: employeeId,
        date,
        check_in: firstIn.toTimeString().slice(0, 5),
        check_out: lastOut ? lastOut.toTimeString().slice(0, 5) : '',
        hours_worked: hoursWorked,
        status: 'present',
      },
      { upsert: true, new: true }
    );

    // Mark punches as linked
    const punchIds = dayPunches.map(p => p._id);
    await BiometricPunch.updateMany({ _id: { $in: punchIds } }, { attendance_linked: true });
    linked += dayPunches.length;
  }

  res.json({ message: 'Attendance linked successfully', punches_linked: linked, attendance_records: Object.keys(grouped).length });
}));

export default router;
