import { Router, Request, Response } from 'express';
import { SupportMacro } from '../models/SupportMacro.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = Router();

// List macros
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const { category, search } = req.query;
  const filter: any = {
    tenant_id,
    $or: [{ visibility: 'global' }, { visibility: 'team' }, { owner_id: userId }],
  };
  if (category) filter.category = category;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const macros = await SupportMacro.find(filter).sort({ usage_count: -1 });
  res.json({ data: macros });
}));

// Get one
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const macro = await SupportMacro.findOne({ _id: req.params.id, tenant_id });
  if (!macro) return res.status(404).json({ error: 'Macro not found' });
  res.json({ data: macro });
}));

// Create
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const owner_id = (req as any).user?.userId;
  const macro = await SupportMacro.create({ ...req.body, tenant_id, owner_id });
  res.status(201).json({ data: macro });
}));

// Update
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const macro = await SupportMacro.findOneAndUpdate({ _id: req.params.id, tenant_id }, req.body, { new: true });
  if (!macro) return res.status(404).json({ error: 'Macro not found' });
  res.json({ data: macro });
}));

// Delete
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await SupportMacro.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Apply macro to ticket
router.post('/:id/apply/:ticketId', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const macro = await SupportMacro.findOne({ _id: req.params.id, tenant_id });
  if (!macro) return res.status(404).json({ error: 'Macro not found' });

  const mongoose = (await import('mongoose')).default;
  const TicketModel = mongoose.model('SupportTicket');
  const ticket: any = await TicketModel.findOne({ _id: req.params.ticketId, tenant_id });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const appliedActions: string[] = [];
  for (const action of macro.actions) {
    switch (action.type) {
      case 'set_status': ticket.status = action.value; appliedActions.push(`Status -> ${action.value}`); break;
      case 'set_priority': ticket.priority = action.value; appliedActions.push(`Priority -> ${action.value}`); break;
      case 'set_assignee': ticket.assigned_to = action.value; appliedActions.push(`Assigned to ${action.value}`); break;
      case 'add_tags': ticket.tags = [...new Set([...(ticket.tags || []), ...(Array.isArray(action.value) ? action.value : [action.value])])]; appliedActions.push(`Added tags`); break;
      case 'remove_tags': ticket.tags = (ticket.tags || []).filter((t: string) => !(Array.isArray(action.value) ? action.value : [action.value]).includes(t)); appliedActions.push(`Removed tags`); break;
      case 'set_type': ticket.type = action.value; appliedActions.push(`Type -> ${action.value}`); break;
      default: appliedActions.push(`${action.type} (queued)`);
    }
  }
  await ticket.save();
  macro.usage_count += 1;
  macro.last_used_at = new Date();
  await macro.save();

  res.json({ data: { ticket, applied_actions: appliedActions } });
}));

// Popular macros
router.get('/popular', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const limit = parseInt(req.query.limit as string) || 10;
  const macros = await SupportMacro.find({ tenant_id }).sort({ usage_count: -1 }).limit(limit);
  res.json({ data: macros });
}));

// Categories
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const categories = await SupportMacro.distinct('category', { tenant_id, category: { $ne: null } });
  res.json({ data: categories });
}));

export default router;
