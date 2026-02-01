import mongoose from 'mongoose';
import { ProductionSchedule, IProductionSchedule } from '../models/ProductionSchedule.js';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import Workcenter from '../models/Workcenter.js';

interface TimeSlot { start: Date; end: Date; }
interface WorkCenterSchedule { work_center_id: string; capacity: number; slots: TimeSlot[]; }

const PRIORITY_MAP: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

export class ProductionSchedulerService {
  async generateSchedule(tenantId: string, periodStart: Date, periodEnd: Date, objective: string = 'minimize_makespan', createdBy?: string): Promise<IProductionSchedule> {
    const mos = await ManufacturingOrder.find({
      state: { $in: ['confirmed', 'planned', 'in_progress'] },
      date_planned_start: { $lte: periodEnd },
      date_planned_finished: { $gte: periodStart },
    }).lean();

    const workCenters = await Workcenter.find({ tenant_id: tenantId, active: true }).lean();

    const wcSchedules: Record<string, WorkCenterSchedule> = {};
    for (const wc of workCenters) {
      wcSchedules[wc._id.toString()] = { work_center_id: wc._id.toString(), capacity: wc.capacity || 1, slots: [] };
    }

    const rawJobs = mos.map((mo: any, idx: number) => ({
      idx, mo, priority: PRIORITY_MAP[mo.priority] || 2,
      due: mo.date_planned_finished ? new Date(mo.date_planned_finished).getTime() : Number.MAX_SAFE_INTEGER,
    }));
    rawJobs.sort((a, b) => { if (b.priority !== a.priority) return b.priority - a.priority; return a.due - b.due; });

    const jobs: any[] = [];
    const conflicts: any[] = [];
    let maxEnd = periodStart.getTime();

    for (const rj of rawJobs) {
      const mo = rj.mo;
      const wcId = workCenters.length > 0 ? workCenters[rj.idx % workCenters.length]._id.toString() : null;
      const durationHours = mo.date_planned_start && mo.date_planned_finished
        ? (new Date(mo.date_planned_finished).getTime() - new Date(mo.date_planned_start).getTime()) / 3600000 : 8;
      const setupHours = 0.5;

      let slotStart = periodStart.getTime();
      if (wcId && wcSchedules[wcId]) {
        for (const slot of wcSchedules[wcId].slots) {
          const slotEndTime = slot.end.getTime();
          if (slotEndTime > slotStart) slotStart = slotEndTime;
        }
      }

      const totalHours = setupHours + durationHours;
      const plannedStart = new Date(slotStart);
      const plannedEnd = new Date(slotStart + totalHours * 3600000);

      if (plannedEnd.getTime() > periodEnd.getTime()) {
        conflicts.push({ type: 'timeline_overlap', description: 'Job for MO ' + mo.mo_number + ' extends beyond schedule period', job_indices: [jobs.length] });
      }
      if (wcId && wcSchedules[wcId]) wcSchedules[wcId].slots.push({ start: plannedStart, end: plannedEnd });
      if (plannedEnd.getTime() > maxEnd) maxEnd = plannedEnd.getTime();

      jobs.push({
        manufacturing_order_id: mo._id, product_id: mo.product_id,
        work_center_id: wcId ? new mongoose.Types.ObjectId(wcId) : undefined,
        operation_id: undefined, sequence: jobs.length,
        planned_start: plannedStart, planned_end: plannedEnd,
        duration_hours: durationHours, setup_time_hours: setupHours,
        priority: rj.priority, dependencies: [], status: 'scheduled',
      });
    }

    const totalMakespanHours = (maxEnd - periodStart.getTime()) / 3600000;
    const periodHours = (periodEnd.getTime() - periodStart.getTime()) / 3600000;
    const totalScheduledHours = jobs.reduce((s: number, j: any) => s + j.duration_hours + j.setup_time_hours, 0);
    const totalCapacityHours = workCenters.length * periodHours;
    const utilizationPct = totalCapacityHours > 0 ? Math.round((totalScheduledHours / totalCapacityHours) * 100) : 0;

    let changeovers = 0;
    for (const wcId of Object.keys(wcSchedules)) {
      const wcJobs = jobs.filter((j: any) => j.work_center_id?.toString() === wcId);
      for (let i = 1; i < wcJobs.length; i++) {
        if (wcJobs[i].product_id?.toString() !== wcJobs[i - 1].product_id?.toString()) changeovers++;
      }
    }

    const schedule = await ProductionSchedule.create({
      tenant_id: tenantId,
      schedule_name: 'Schedule ' + periodStart.toISOString().slice(0, 10) + ' to ' + periodEnd.toISOString().slice(0, 10),
      period_start: periodStart, period_end: periodEnd,
      status: 'optimized', optimization_objective: objective,
      jobs, total_makespan_hours: Math.round(totalMakespanHours * 100) / 100,
      utilization_pct: utilizationPct, changeover_count: changeovers,
      conflicts, created_by: createdBy ? new mongoose.Types.ObjectId(createdBy) : undefined,
    });
    return schedule;
  }

  async reschedule(scheduleId: string, changedJobs: { index: number; planned_start?: Date; planned_end?: Date; work_center_id?: string }[]): Promise<IProductionSchedule> {
    const schedule = await ProductionSchedule.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');
    if (schedule.status === 'locked') throw new Error('Schedule is locked');

    for (const change of changedJobs) {
      const job = schedule.jobs[change.index];
      if (!job) continue;
      if (change.planned_start) job.planned_start = change.planned_start;
      if (change.planned_end) job.planned_end = change.planned_end;
      if (change.work_center_id) job.work_center_id = new mongoose.Types.ObjectId(change.work_center_id);
      if (job.planned_start && job.planned_end) {
        job.duration_hours = (new Date(job.planned_end).getTime() - new Date(job.planned_start).getTime()) / 3600000 - job.setup_time_hours;
      }
    }

    const conflicts: any[] = [];
    const wcSlots: Record<string, { start: number; end: number; idx: number }[]> = {};
    schedule.jobs.forEach((job, idx) => {
      const wcId = job.work_center_id?.toString() || 'unassigned';
      if (!wcSlots[wcId]) wcSlots[wcId] = [];
      wcSlots[wcId].push({ start: new Date(job.planned_start).getTime(), end: new Date(job.planned_end).getTime(), idx });
    });
    for (const [, slots] of Object.entries(wcSlots)) {
      slots.sort((a, b) => a.start - b.start);
      for (let i = 1; i < slots.length; i++) {
        if (slots[i].start < slots[i - 1].end) {
          conflicts.push({ type: 'resource_conflict', description: 'Jobs ' + slots[i-1].idx + ' and ' + slots[i].idx + ' overlap', job_indices: [slots[i-1].idx, slots[i].idx] });
        }
      }
    }
    schedule.conflicts = conflicts;
    schedule.status = 'optimized';
    let maxEnd = schedule.period_start.getTime();
    for (const job of schedule.jobs) { const end = new Date(job.planned_end).getTime(); if (end > maxEnd) maxEnd = end; }
    schedule.total_makespan_hours = Math.round(((maxEnd - schedule.period_start.getTime()) / 3600000) * 100) / 100;
    await schedule.save();
    return schedule;
  }

  async getBottlenecks(tenantId: string, periodStart: Date, periodEnd: Date): Promise<{ work_center_id: string; name: string; utilization_pct: number; scheduled_hours: number }[]> {
    const periodHours = (periodEnd.getTime() - periodStart.getTime()) / 3600000;
    const schedules = await ProductionSchedule.find({
      tenant_id: tenantId, period_start: { $lte: periodEnd }, period_end: { $gte: periodStart },
      status: { $in: ['optimized', 'published'] },
    }).lean();

    const wcHours: Record<string, number> = {};
    for (const schedule of schedules) {
      for (const job of schedule.jobs) {
        const wcId = job.work_center_id?.toString();
        if (!wcId) continue;
        wcHours[wcId] = (wcHours[wcId] || 0) + (job.duration_hours || 0) + (job.setup_time_hours || 0);
      }
    }

    const workCenters = await Workcenter.find({ tenant_id: tenantId, active: true }).lean();
    const wcMap: Record<string, any> = {};
    for (const wc of workCenters) wcMap[wc._id.toString()] = wc;

    const bottlenecks: any[] = [];
    for (const [wcId, hours] of Object.entries(wcHours)) {
      const wc = wcMap[wcId];
      const capacity = wc?.capacity || 1;
      const totalCapacity = periodHours * capacity;
      const utilPct = totalCapacity > 0 ? Math.round((hours / totalCapacity) * 100) : 0;
      if (utilPct >= 90) {
        bottlenecks.push({ work_center_id: wcId, name: wc?.name || 'Unknown', utilization_pct: utilPct, scheduled_hours: Math.round(hours * 100) / 100 });
      }
    }
    bottlenecks.sort((a, b) => b.utilization_pct - a.utilization_pct);
    return bottlenecks;
  }
}

export const productionSchedulerService = new ProductionSchedulerService();
export default productionSchedulerService;
