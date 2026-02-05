import { Router, Request, Response } from 'express';
import { AgentPresence } from '../models/AgentPresence.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

// Heartbeat - update presence
router.post('/heartbeat', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const agent_id = (req as any).user?.userId;
  const { currently_viewing_ticket_id } = req.body;
  const presence = await AgentPresence.findOneAndUpdate(
    { tenant_id, agent_id },
    { tenant_id, agent_id, status: 'online', last_active_at: new Date(), ...(currently_viewing_ticket_id !== undefined && { currently_viewing_ticket_id }) },
    { upsert: true, new: true }
  );
  res.json({ data: presence });
}));

// Who is viewing a ticket
router.get('/ticket/:ticketId/viewers', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const viewers = await AgentPresence.find({
    tenant_id,
    currently_viewing_ticket_id: req.params.ticketId,
    status: { $ne: 'offline' },
    last_active_at: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
  }).populate('agent_id', 'name email avatar');
  res.json({ data: viewers });
}));

// All agent statuses
router.get('/agents/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const agents = await AgentPresence.find({ tenant_id }).populate('agent_id', 'name email avatar').sort({ status: 1 });
  res.json({ data: agents });
}));

// Update own status
router.put('/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const agent_id = (req as any).user?.userId;
  const { status } = req.body;
  const presence = await AgentPresence.findOneAndUpdate(
    { tenant_id, agent_id },
    { status, last_active_at: new Date() },
    { upsert: true, new: true }
  );
  res.json({ data: presence });
}));

// Workload distribution
router.get('/workload', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const agents = await AgentPresence.find({ tenant_id, status: { $ne: 'offline' } })
    .populate('agent_id', 'name email avatar');
  const workload = agents.map((a: any) => ({
    agent: a.agent_id,
    status: a.status,
    current_load: a.current_load,
    capacity_limit: a.capacity_limit,
    utilization: a.capacity_limit ? Math.round((a.current_load / a.capacity_limit) * 100) : 0,
    active_tickets: a.active_tickets?.length || 0,
  }));
  res.json({ data: workload });
}));

export default router;
