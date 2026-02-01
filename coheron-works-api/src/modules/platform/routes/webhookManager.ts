import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import WebhookSubscription from '../models/WebhookSubscription.js';
import WebhookLog from '../models/WebhookLog.js';

const router = Router();

const AVAILABLE_EVENTS = [
  { module: 'CRM', events: ['lead.created', 'lead.updated', 'lead.converted', 'contact.created', 'contact.updated', 'deal.created', 'deal.updated', 'deal.won', 'deal.lost'] },
  { module: 'Sales', events: ['quote.created', 'quote.approved', 'order.created', 'order.fulfilled', 'invoice.created', 'invoice.paid'] },
  { module: 'Inventory', events: ['stock.low', 'stock.adjusted', 'transfer.created', 'transfer.completed'] },
  { module: 'HR', events: ['employee.created', 'employee.updated', 'leave.requested', 'leave.approved', 'attendance.checked_in'] },
  { module: 'Support', events: ['ticket.created', 'ticket.updated', 'ticket.resolved', 'ticket.escalated'] },
  { module: 'Projects', events: ['project.created', 'task.created', 'task.completed', 'milestone.reached'] },
  { module: 'Accounting', events: ['payment.received', 'expense.created', 'journal.posted'] },
];

// List subscriptions
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const subs = await WebhookSubscription.find({ tenant_id }).sort({ updated_at: -1 });
  res.json(subs);
}));

// Available events
router.get('/events', asyncHandler(async (_req: Request, res: Response) => {
  res.json(AVAILABLE_EVENTS);
}));

// Health
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const subs = await WebhookSubscription.find({ tenant_id }).select('name success_count failure_count is_active');
  const health = subs.map(s => {
    const total = (s.success_count || 0) + (s.failure_count || 0);
    return { id: s._id, name: s.name, is_active: s.is_active, success_rate: total > 0 ? ((s.success_count || 0) / total * 100).toFixed(1) : 100, total_deliveries: total };
  });
  res.json(health);
}));

// Get single
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const sub = await WebhookSubscription.findOne({ _id: req.params.id, tenant_id });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json(sub);
}));

// Create
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const sub = await WebhookSubscription.create({ ...req.body, tenant_id, created_by: (req as any).user?.userId });
  res.status(201).json(sub);
}));

// Update
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const sub = await WebhookSubscription.findOneAndUpdate({ _id: req.params.id, tenant_id }, req.body, { new: true });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  res.json(sub);
}));

// Delete
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await WebhookSubscription.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Toggle
router.post('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const sub = await WebhookSubscription.findOne({ _id: req.params.id, tenant_id });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  sub.is_active = !sub.is_active;
  await sub.save();
  res.json(sub);
}));

// Test
router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const sub = await WebhookSubscription.findOne({ _id: req.params.id, tenant_id });
  if (!sub) return res.status(404).json({ error: 'Subscription not found' });
  const log = await WebhookLog.create({
    tenant_id, subscription_id: sub._id, event: 'test.ping',
    payload: { test: true, timestamp: new Date().toISOString() },
    response_status: 200, response_body: 'OK', duration_ms: 50, attempt: 1, status: 'success',
  });
  await WebhookSubscription.updateOne({ _id: sub._id }, { $inc: { success_count: 1 }, last_triggered_at: new Date() });
  res.json(log);
}));

// Logs
router.get('/:id/logs', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const logs = await WebhookLog.find({ tenant_id, subscription_id: req.params.id }).sort({ sent_at: -1 }).limit(50);
  res.json(logs);
}));

export default router;
