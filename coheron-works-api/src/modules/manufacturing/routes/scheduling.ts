import express from 'express';
import { ProductionSchedule } from '../../../models/ProductionSchedule.js';
import { productionSchedulerService } from '../../../services/productionSchedulerService.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// POST /generate
router.post('/generate', asyncHandler(async (req: any, res: any) => {
  const { tenant_id, period_start, period_end, objective } = req.body;
  const schedule = await productionSchedulerService.generateSchedule(tenant_id, new Date(period_start), new Date(period_end), objective || 'minimize_makespan', req.user?._id);
  res.status(201).json(schedule);
}));

// GET /
router.get('/', asyncHandler(async (req: any, res: any) => {
  const { tenant_id, status } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(ProductionSchedule.find(filter).sort({ period_start: -1 }).lean(), pagination, filter, ProductionSchedule);
  res.json(result);
}));

// GET /bottlenecks
router.get('/bottlenecks', asyncHandler(async (req: any, res: any) => {
  const { tenant_id, period_start, period_end } = req.query;
  if (!tenant_id || !period_start || !period_end) return res.status(400).json({ error: 'tenant_id, period_start, period_end required' });
  const bottlenecks = await productionSchedulerService.getBottlenecks(tenant_id as string, new Date(period_start as string), new Date(period_end as string));
  res.json({ bottlenecks });
}));

// GET /:id
router.get('/:id', asyncHandler(async (req: any, res: any) => {
  const schedule = await ProductionSchedule.findById(req.params.id).lean();
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  const gantt_data = schedule.jobs.map((job: any, idx: number) => ({
    id: idx, name: 'Job ' + idx + ' - MO ' + job.manufacturing_order_id,
    start: job.planned_start, end: job.planned_end, work_center_id: job.work_center_id,
    progress: job.status === 'completed' ? 100 : job.status === 'in_progress' ? 50 : 0,
    dependencies: job.dependencies,
  }));
  res.json({ ...schedule, gantt_data });
}));

// PUT /:id/publish
router.put('/:id/publish', asyncHandler(async (req: any, res: any) => {
  const schedule = await ProductionSchedule.findById(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  if (schedule.status === 'locked') return res.status(400).json({ error: 'Schedule is locked' });
  schedule.status = 'published'; await schedule.save(); res.json(schedule);
}));

// PUT /:id/lock
router.put('/:id/lock', asyncHandler(async (req: any, res: any) => {
  const schedule = await ProductionSchedule.findById(req.params.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
  schedule.status = 'locked'; await schedule.save(); res.json(schedule);
}));

// POST /:id/reschedule
router.post('/:id/reschedule', asyncHandler(async (req: any, res: any) => {
  const { changed_jobs } = req.body;
  const schedule = await productionSchedulerService.reschedule(req.params.id, changed_jobs || []);
  res.json(schedule);
}));

export default router;
