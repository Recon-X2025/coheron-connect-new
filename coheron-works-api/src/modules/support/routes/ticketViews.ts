import { Router, Request, Response } from 'express';
import { TicketView } from '../models/TicketView.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = Router();

// List views
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const views = await TicketView.find({
    tenant_id,
    $or: [{ visibility: 'global' }, { visibility: 'shared' }, { owner_id: userId }],
  }).sort({ position: 1 });
  res.json({ data: views });
}));

// Get one
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const view = await TicketView.findOne({ _id: req.params.id, tenant_id });
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json({ data: view });
}));

// Create
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const owner_id = (req as any).user?.userId;
  const view = await TicketView.create({ ...req.body, tenant_id, owner_id });
  res.status(201).json({ data: view });
}));

// Update
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const view = await TicketView.findOneAndUpdate({ _id: req.params.id, tenant_id }, req.body, { new: true });
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json({ data: view });
}));

// Delete
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await TicketView.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Reorder
router.post('/reorder', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { order } = req.body;
  const ops = (order || []).map((item: any) => ({
    updateOne: { filter: { _id: item.id, tenant_id }, update: { position: item.position } }
  }));
  await TicketView.bulkWrite(ops);
  res.json({ success: true });
}));

// Ticket count for a view
router.get('/:id/count', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const view = await TicketView.findOne({ _id: req.params.id, tenant_id });
  if (!view) return res.status(404).json({ error: 'View not found' });
  const mongoFilter = buildMongoFilter(view.conditions, tenant_id);
  // Use dynamic model lookup for SupportTicket
  const mongoose = (await import('mongoose')).default;
  const TicketModel = mongoose.model('SupportTicket');
  const count = await TicketModel.countDocuments(mongoFilter);
  res.json({ data: { count } });
}));

// Execute view - return matching tickets
router.get('/:id/tickets', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const view = await TicketView.findOne({ _id: req.params.id, tenant_id });
  if (!view) return res.status(404).json({ error: 'View not found' });
  const mongoFilter = buildMongoFilter(view.conditions, tenant_id);
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 25;
  const mongoose = (await import('mongoose')).default;
  const TicketModel = mongoose.model('SupportTicket');
  const sort: any = { [view.sort_by || 'created_at']: view.sort_order === 'asc' ? 1 : -1 };
  const [tickets, total] = await Promise.all([
    TicketModel.find(mongoFilter).sort(sort).skip((page - 1) * limit).limit(limit),
    TicketModel.countDocuments(mongoFilter),
  ]);
  res.json({ data: tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));

function buildMongoFilter(conditions: any, tenant_id: any): any {
  const filter: any = { tenant_id };
  const allConditions = (conditions?.all || []).map(condToMongo);
  const anyConditions = (conditions?.any || []).map(condToMongo);
  if (allConditions.length) Object.assign(filter, ...allConditions);
  if (anyConditions.length) filter.$or = anyConditions;
  return filter;
}

function condToMongo(c: any): any {
  switch (c.operator) {
    case 'is': return { [c.field]: c.value };
    case 'is_not': return { [c.field]: { $ne: c.value } };
    case 'contains': return { [c.field]: { $regex: c.value, $options: 'i' } };
    case 'not_contains': return { [c.field]: { $not: { $regex: c.value, $options: 'i' } } };
    case 'greater_than': return { [c.field]: { $gt: c.value } };
    case 'less_than': return { [c.field]: { $lt: c.value } };
    default: return {};
  }
}

export default router;
