import { Router, Request, Response } from 'express';
import { SupportTrigger } from '../models/SupportTrigger.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = Router();

// List triggers
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { event, is_active, search } = req.query;
  const filter: any = { tenant_id };
  if (event) filter.trigger_event = event;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (search) filter.name = { $regex: search, $options: 'i' };
  const triggers = await SupportTrigger.find(filter).sort({ priority: 1 });
  res.json({ data: triggers });
}));

// Get one
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const trigger = await SupportTrigger.findOne({ _id: req.params.id, tenant_id });
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
  res.json({ data: trigger });
}));

// Create
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const created_by = (req as any).user?.userId;
  const trigger = await SupportTrigger.create({ ...req.body, tenant_id, created_by });
  res.status(201).json({ data: trigger });
}));

// Update
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const trigger = await SupportTrigger.findOneAndUpdate({ _id: req.params.id, tenant_id }, req.body, { new: true });
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
  res.json({ data: trigger });
}));

// Delete
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await SupportTrigger.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Toggle active
router.post('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const trigger = await SupportTrigger.findOne({ _id: req.params.id, tenant_id });
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
  trigger.is_active = !trigger.is_active;
  await trigger.save();
  res.json({ data: trigger });
}));

// Reorder
router.post('/reorder', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { order } = req.body; // [{id, priority}]
  const ops = (order || []).map((item: any) => ({
    updateOne: { filter: { _id: item.id, tenant_id }, update: { priority: item.priority } }
  }));
  await SupportTrigger.bulkWrite(ops);
  res.json({ success: true });
}));

// Simulate trigger against sample ticket
router.post('/simulate', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { event, ticket } = req.body;
  const triggers = await SupportTrigger.find({ tenant_id, trigger_event: event, is_active: true }).sort({ priority: 1 });

  const matched: any[] = [];
  for (const trigger of triggers) {
    const allMatch = (trigger.conditions.all || []).every((c: any) => evaluateCondition(c, ticket));
    const anyMatch = (trigger.conditions.any || []).length === 0 || (trigger.conditions.any || []).some((c: any) => evaluateCondition(c, ticket));
    if (allMatch && anyMatch) {
      matched.push({ id: trigger._id, name: trigger.name, actions: trigger.actions });
    }
  }
  res.json({ data: { matched, total_evaluated: triggers.length } });
}));

// Stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const [total, active, byEvent] = await Promise.all([
    SupportTrigger.countDocuments({ tenant_id }),
    SupportTrigger.countDocuments({ tenant_id, is_active: true }),
    SupportTrigger.aggregate([
      { $match: { tenant_id } },
      { $group: { _id: '$trigger_event', count: { $sum: 1 }, total_executions: { $sum: '$execution_count' } } },
    ]),
  ]);
  res.json({ data: { total, active, by_event: byEvent } });
}));

// Execution log (recent triggers that fired)
router.get('/execution-log', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const limit = parseInt(req.query.limit as string) || 50;
  const recent = await SupportTrigger.find({ tenant_id, last_triggered_at: { $ne: null } })
    .sort({ last_triggered_at: -1 }).limit(limit).select('name trigger_event execution_count last_triggered_at');
  res.json({ data: recent });
}));

function evaluateCondition(condition: any, ticket: any): boolean {
  const val = ticket[condition.field];
  switch (condition.operator) {
    case 'is': return val === condition.value;
    case 'is_not': return val !== condition.value;
    case 'contains': return typeof val === 'string' && val.includes(condition.value);
    case 'not_contains': return typeof val === 'string' && !val.includes(condition.value);
    case 'greater_than': return Number(val) > Number(condition.value);
    case 'less_than': return Number(val) < Number(condition.value);
    default: return false;
  }
}

export default router;
