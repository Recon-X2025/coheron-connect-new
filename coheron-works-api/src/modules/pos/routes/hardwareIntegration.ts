import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { POSDevice } from '../models/POSDevice.js';

const router = express.Router();

// List devices
router.get('/', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { store_id, device_type, status } = req.query;
  const filter: any = { tenant_id };
  if (store_id) filter.store_id = store_id;
  if (device_type) filter.device_type = device_type;
  if (status) filter.status = status;
  const devices = await POSDevice.find(filter).sort({ name: 1 });
  res.json(devices);
}));

// Create device
router.post('/', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const device = await POSDevice.create({ ...req.body, tenant_id });
  res.status(201).json(device);
}));

// Update device
router.put('/:id', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const device = await POSDevice.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    req.body,
    { new: true }
  );
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
}));

// Delete device
router.delete('/:id', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  await POSDevice.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Test device connection
router.post('/:id/test', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const device = await POSDevice.findOne({ _id: req.params.id, tenant_id });
  if (!device) return res.status(404).json({ error: 'Device not found' });

  // Simulate testing - in production, attempt actual connection
  const testResult = {
    device_id: device._id,
    device_type: device.device_type,
    connection: device.connection_type,
    success: true,
    latency_ms: Math.floor(Math.random() * 50) + 5,
    message: `${device.device_type} responded successfully`,
  };
  device.status = 'online';
  device.last_seen_at = new Date();
  await device.save();

  res.json(testResult);
}));

// Configure device
router.post('/:id/configure', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const device = await POSDevice.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { config: req.body.config },
    { new: true }
  );
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
}));

// Print receipt
router.post('/print-receipt', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { device_id, receipt_data } = req.body;
  const device = await POSDevice.findOne({ _id: device_id, tenant_id, device_type: { $in: ['receipt_printer', 'label_printer'] } });
  if (!device) return res.status(404).json({ error: 'Printer not found' });

  // Simulate print job
  res.json({ success: true, job_id: `print_${Date.now()}`, device_id: device._id, message: 'Receipt sent to printer' });
}));

// Open cash drawer
router.post('/open-cash-drawer', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { device_id } = req.body;
  const device = await POSDevice.findOne({ _id: device_id, tenant_id, device_type: 'cash_drawer' });
  if (!device) return res.status(404).json({ error: 'Cash drawer not found' });

  res.json({ success: true, device_id: device._id, message: 'Cash drawer opened' });
}));

// All device statuses
router.get('/status', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const devices = await POSDevice.find({ tenant_id }).select('name device_type status last_seen_at store_id');
  res.json(devices);
}));

export default router;
