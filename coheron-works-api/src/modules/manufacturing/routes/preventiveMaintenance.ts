import express from 'express';
import { MaintenanceSchedule } from '../models/MaintenanceSchedule.js';
import { MaintenanceLog } from '../models/MaintenanceLog.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ==================== SCHEDULES ====================

// List maintenance schedules
router.get('/schedules', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.maintenance_type) filter.maintenance_type = req.query.maintenance_type;
  if (req.query.equipment_id) filter.equipment_id = req.query.equipment_id;

  const data = await MaintenanceSchedule.find(filter)
    .populate('assigned_team', 'name email')
    .sort({ next_maintenance_date: 1 })
    .lean();
  res.json({ data });
}));

// Create schedule
router.post('/schedules', asyncHandler(async (req, res) => {
  const schedule = await MaintenanceSchedule.create(req.body);
  res.status(201).json({ data: schedule });
}));

// Get schedule by ID
router.get('/schedules/:id', asyncHandler(async (req, res) => {
  const schedule = await MaintenanceSchedule.findById(req.params.id)
    .populate('assigned_team', 'name email')
    .lean();
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ data: schedule });
}));

// Update schedule
router.put('/schedules/:id', asyncHandler(async (req, res) => {
  const schedule = await MaintenanceSchedule.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ data: schedule });
}));

// Delete schedule
router.delete('/schedules/:id', asyncHandler(async (req, res) => {
  const schedule = await MaintenanceSchedule.findByIdAndDelete(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ message: 'Schedule deleted' });
}));

// Upcoming maintenance (next 30 days)
router.get('/upcoming', asyncHandler(async (req, res) => {
  const filter: any = { status: 'active' };
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  filter.next_maintenance_date = { $lte: thirtyDaysFromNow };

  const data = await MaintenanceSchedule.find(filter)
    .populate('assigned_team', 'name email')
    .sort({ next_maintenance_date: 1 })
    .lean();

  // Flag overdue items
  const now = new Date();
  const enriched = data.map((s: any) => ({
    ...s,
    is_overdue: new Date(s.next_maintenance_date) < now,
  }));

  res.json({ data: enriched });
}));

// ==================== LOGS ====================

// List maintenance logs
router.get('/logs', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;
  if (req.query.equipment_id) filter.equipment_id = req.query.equipment_id;
  if (req.query.log_type) filter.log_type = req.query.log_type;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.schedule_id) filter.schedule_id = req.query.schedule_id;

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MaintenanceLog.find(filter)
      .populate('performed_by', 'name email')
      .populate('schedule_id', 'schedule_name equipment_name')
      .sort({ started_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MaintenanceLog.countDocuments(filter),
  ]);

  res.json({ data, total, page, limit });
}));

// Create maintenance log
router.post('/logs', asyncHandler(async (req, res) => {
  const log = await MaintenanceLog.create(req.body);

  // If linked to a schedule, update last_maintenance_date and recalculate next
  if (req.body.schedule_id) {
    const schedule = await MaintenanceSchedule.findById(req.body.schedule_id);
    if (schedule) {
      schedule.last_maintenance_date = new Date();

      // Recalculate next maintenance date based on frequency
      const now = new Date();
      const freqMap: Record<string, number> = {
        daily: 1, weekly: 7, monthly: 30, quarterly: 90,
        semi_annual: 182, annual: 365,
      };
      if (schedule.frequency !== 'usage_based' && freqMap[schedule.frequency]) {
        const next = new Date(now);
        next.setDate(next.getDate() + freqMap[schedule.frequency]);
        schedule.next_maintenance_date = next;
      }

      // Update breakdown stats if this is a breakdown log
      if (req.body.log_type === 'breakdown') {
        schedule.total_breakdowns += 1;
      }
      if (req.body.downtime_hours) {
        schedule.total_downtime_hours += req.body.downtime_hours;
      }

      await schedule.save();
    }
  }

  res.status(201).json({ data: log });
}));

// Get log by ID
router.get('/logs/:id', asyncHandler(async (req, res) => {
  const log = await MaintenanceLog.findById(req.params.id)
    .populate('performed_by', 'name email')
    .populate('schedule_id', 'schedule_name equipment_name')
    .lean();
  if (!log) return res.status(404).json({ error: 'Log not found' });
  res.json({ data: log });
}));

// Update log
router.put('/logs/:id', asyncHandler(async (req, res) => {
  const log = await MaintenanceLog.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!log) return res.status(404).json({ error: 'Log not found' });
  res.json({ data: log });
}));

// ==================== MTBF / MTTR ====================

// Calculate MTBF and MTTR for equipment
router.get('/metrics/:equipmentId', asyncHandler(async (req, res) => {
  const { equipmentId } = req.params;
  const tenantFilter: any = { equipment_id: equipmentId };
  if (req.query.tenant_id) tenantFilter.tenant_id = req.query.tenant_id;

  // Get schedule for this equipment
  const schedule = await MaintenanceSchedule.findOne({ ...tenantFilter, status: 'active' }).lean();

  // Get all breakdown logs for this equipment
  const breakdownLogs = await MaintenanceLog.find({
    ...tenantFilter,
    log_type: 'breakdown',
    status: 'completed',
  }).sort({ started_at: 1 }).lean();

  const allLogs = await MaintenanceLog.find({
    ...tenantFilter,
    status: 'completed',
  }).sort({ started_at: 1 }).lean();

  const totalBreakdowns = breakdownLogs.length;
  const totalDowntimeHours = allLogs.reduce((sum: number, l: any) => sum + (l.downtime_hours || 0), 0);
  const totalRepairHours = breakdownLogs.reduce((sum: number, l: any) => sum + (l.downtime_hours || 0), 0);
  const totalCost = allLogs.reduce((sum: number, l: any) => sum + (l.total_cost || 0), 0);

  const operationalHours = schedule?.total_operational_hours || 0;

  // MTBF = Total Operational Hours / Number of Breakdowns
  const mtbf = totalBreakdowns > 0 ? operationalHours / totalBreakdowns : operationalHours || 0;

  // MTTR = Total Repair Time / Number of Breakdowns
  const mttr = totalBreakdowns > 0 ? totalRepairHours / totalBreakdowns : 0;

  // Availability = MTBF / (MTBF + MTTR)
  const availability = (mtbf + mttr) > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;

  // Update schedule with computed values
  if (schedule) {
    await MaintenanceSchedule.findByIdAndUpdate(schedule._id, {
      mtbf_hours: Math.round(mtbf * 100) / 100,
      mttr_hours: Math.round(mttr * 100) / 100,
      total_breakdowns: totalBreakdowns,
      total_downtime_hours: totalDowntimeHours,
    });
  }

  res.json({
    data: {
      equipment_id: equipmentId,
      equipment_name: schedule?.equipment_name || 'Unknown',
      mtbf_hours: Math.round(mtbf * 100) / 100,
      mttr_hours: Math.round(mttr * 100) / 100,
      availability_percent: Math.round(availability * 100) / 100,
      total_breakdowns: totalBreakdowns,
      total_downtime_hours: Math.round(totalDowntimeHours * 100) / 100,
      total_maintenance_cost: Math.round(totalCost * 100) / 100,
      total_logs: allLogs.length,
      operational_hours: operationalHours,
    },
  });
}));

// Equipment health dashboard - all equipment metrics
router.get('/health', asyncHandler(async (req, res) => {
  const filter: any = { status: 'active' };
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;

  const schedules = await MaintenanceSchedule.find(filter).lean();
  const now = new Date();

  const health = schedules.map((s: any) => {
    const mtbf = s.mtbf_hours || 0;
    const mttr = s.mttr_hours || 0;
    const availability = (mtbf + mttr) > 0 ? (mtbf / (mtbf + mttr)) * 100 : 100;
    const isOverdue = new Date(s.next_maintenance_date) < now;
    const daysUntilNext = Math.ceil((new Date(s.next_maintenance_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let healthStatus = 'good';
    if (availability < 85 || isOverdue) healthStatus = 'critical';
    else if (availability < 95 || daysUntilNext <= 3) healthStatus = 'warning';

    return {
      equipment_id: s.equipment_id,
      equipment_name: s.equipment_name,
      schedule_name: s.schedule_name,
      maintenance_type: s.maintenance_type,
      mtbf_hours: mtbf,
      mttr_hours: mttr,
      availability_percent: Math.round(availability * 100) / 100,
      next_maintenance_date: s.next_maintenance_date,
      days_until_next: daysUntilNext,
      is_overdue: isOverdue,
      total_breakdowns: s.total_breakdowns,
      health_status: healthStatus,
    };
  });

  res.json({ data: health });
}));

export default router;
