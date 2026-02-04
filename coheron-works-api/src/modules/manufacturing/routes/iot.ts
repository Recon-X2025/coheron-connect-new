import { Router } from 'express';
import IoTDevice from '../../../models/IoTDevice.js';
import IoTReading from '../../../models/IoTReading.js';
import IoTAlert from '../../../models/IoTAlert.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

router.get('/devices', authenticate, asyncHandler(async (req: any, res) => {
  const { status, work_center_id, device_type } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (work_center_id) filter.work_center_id = work_center_id;
  if (device_type) filter.device_type = device_type;
  const devices = await IoTDevice.find(filter).populate('work_center_id', 'name code').sort({ name: 1 });
  res.json({ data: devices });
}));

router.post('/devices', authenticate, asyncHandler(async (req: any, res) => {
  const device = await IoTDevice.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(device);
}));

router.get('/devices/:id', authenticate, asyncHandler(async (req: any, res) => {
  const device = await IoTDevice.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('work_center_id', 'name code');
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const latestReadings = await IoTReading.find({ device_id: device._id, tenant_id: req.user.tenant_id }).sort({ timestamp: -1 }).limit(10).lean();
  const recentAlerts = await IoTAlert.find({ device_id: device._id, tenant_id: req.user.tenant_id }).sort({ created_at: -1 }).limit(5).lean();
  res.json({ data: device, latest_readings: latestReadings, recent_alerts: recentAlerts });
}));

router.put('/devices/:id', authenticate, asyncHandler(async (req: any, res) => {
  const device = await IoTDevice.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true, runValidators: true });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json(device);
}));

router.delete('/devices/:id', authenticate, asyncHandler(async (req: any, res) => {
  const device = await IoTDevice.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  await IoTReading.deleteMany({ device_id: device._id });
  await IoTAlert.deleteMany({ device_id: device._id });
  res.json({ message: 'Device removed' });
}));

router.post('/devices/:id/readings', authenticate, asyncHandler(async (req: any, res) => {
  const device = await IoTDevice.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!device) return res.status(404).json({ error: 'Device not found' });
  const { metrics, timestamp } = req.body;
  let anomalyDetected = false;
  let anomalyDetails = '';
  for (const mc of (device as any).metrics_config || []) {
    const value = metrics[mc.metric_name];
    if (value !== undefined && mc.alert_on_breach) {
      const belowMin = mc.min_threshold !== undefined && value < mc.min_threshold;
      const aboveMax = mc.max_threshold !== undefined && value > mc.max_threshold;
      if (belowMin || aboveMax) {
        anomalyDetected = true;
        const breach = belowMin ? 'below min' : 'above max';
        anomalyDetails += mc.metric_name + ' ' + breach + ' (' + value + '); ';
        await IoTAlert.create({
          tenant_id: req.user.tenant_id, device_id: device._id, alert_type: 'threshold_breach',
          severity: 'warning', metric_name: mc.metric_name,
          threshold_value: belowMin ? mc.min_threshold : mc.max_threshold,
          actual_value: value,
          message: (device as any).name + ': ' + mc.metric_name + ' ' + breach + ' threshold',
        });
      }
    }
  }
  const reading = await IoTReading.create({
    tenant_id: req.user.tenant_id, device_id: device._id,
    timestamp: timestamp ? new Date(timestamp) : new Date(),
    metrics, anomaly_detected: anomalyDetected, anomaly_details: anomalyDetails || undefined,
  });
  await IoTDevice.findByIdAndUpdate(device._id, { last_heartbeat_at: new Date(), status: 'online' });
  res.status(201).json(reading);
}));

router.get('/devices/:id/readings', authenticate, asyncHandler(async (req: any, res) => {
  const { start, end, limit: lim } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id, device_id: req.params.id };
  if (start || end) {
    filter.timestamp = {};
    if (start) filter.timestamp['$gte'] = new Date(start as string);
    if (end) filter.timestamp['$lte'] = new Date(end as string);
  }
  const readings = await IoTReading.find(filter).sort({ timestamp: -1 }).limit(parseInt(lim as string) || 100).lean();
  res.json({ data: readings });
}));

router.get('/devices/:id/analytics', authenticate, asyncHandler(async (req: any, res) => {
  const { start, end, metric, interval } = req.query;
  const matchStage: any = { tenant_id: req.user.tenant_id, device_id: req.params.id };
  if (start || end) {
    matchStage.timestamp = {};
    if (start) matchStage.timestamp['$gte'] = new Date(start as string);
    if (end) matchStage.timestamp['$lte'] = new Date(end as string);
  }
  const readings = await IoTReading.find(matchStage).sort({ timestamp: 1 }).lean();
  const metricName = metric as string;
  if (!metricName || readings.length === 0) {
    return res.json({ data: { count: readings.length, message: 'Provide metric query param' } });
  }
  const values = readings.map((r: any) => r.metrics[metricName]).filter((v: any) => v !== undefined);
  const avg = values.reduce((a: number, b: number) => a + b, 0) / (values.length || 1);
  res.json({ data: { metric: metricName, count: values.length, avg: Math.round(avg * 100) / 100, min: Math.min(...values), max: Math.max(...values), interval: interval || 'all' } });
}));

router.get('/alerts', authenticate, asyncHandler(async (req: any, res) => {
  const { severity, is_acknowledged, device_id } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (severity) filter.severity = severity;
  if (is_acknowledged !== undefined) filter.is_acknowledged = is_acknowledged === 'true';
  if (device_id) filter.device_id = device_id;
  const alerts = await IoTAlert.find(filter).populate('device_id', 'name device_id').sort({ created_at: -1 }).limit(200);
  res.json({ data: alerts });
}));

router.post('/alerts/:id/acknowledge', authenticate, asyncHandler(async (req: any, res) => {
  const alert = await IoTAlert.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    { is_acknowledged: true, acknowledged_by: req.user._id, acknowledged_at: new Date() },
    { new: true });
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  res.json(alert);
}));

router.get('/dashboard', authenticate, asyncHandler(async (req: any, res) => {
  const tf = { tenant_id: req.user.tenant_id };
  const [total, online, offline, errorCount] = await Promise.all([
    IoTDevice.countDocuments({ ...tf, is_active: true }),
    IoTDevice.countDocuments({ ...tf, status: 'online', is_active: true }),
    IoTDevice.countDocuments({ ...tf, status: 'offline', is_active: true }),
    IoTDevice.countDocuments({ ...tf, status: 'error', is_active: true }),
  ]);
  const recentAlerts = await IoTAlert.find({ ...tf, is_acknowledged: false })
    .populate('device_id', 'name device_id').sort({ created_at: -1 }).limit(10).lean();
  const critical = await IoTAlert.countDocuments({ ...tf, severity: 'critical', is_acknowledged: false });
  res.json({
    data: {
      devices: { total, online, offline, error: errorCount },
      alerts: { unacknowledged: recentAlerts.length, critical, recent: recentAlerts },
    },
  });
}));

export default router;
