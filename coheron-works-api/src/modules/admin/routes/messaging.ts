import express, { Request, Response } from 'express';
import MessagingIntegration, { MESSAGING_EVENT_TYPES } from '../../../models/MessagingIntegration.js';
import MessagingNotificationLog from '../../../models/MessagingNotificationLog.js';
import { messagingService } from '../../../services/messagingService.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../../shared/middleware/permissions.js';
import logger from '../../../shared/utils/logger.js';

const router = express.Router();

// ====================== Configuration Routes ======================

// GET / - List messaging integrations
router.get('/', requirePermission('admin:messaging:read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const integrations = await MessagingIntegration.find({ tenant_id: tenantId }).select('-config.bot_token -config.signing_secret -config.client_secret');
  res.json({ data: integrations });
}));

// POST / - Create integration
router.post('/', requirePermission('admin:messaging:write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const integration = await MessagingIntegration.create({
    ...req.body,
    tenant_id: tenantId,
    installed_by: (req.user as any)?._id,
    installed_at: new Date(),
  });
  res.status(201).json({ data: integration });
}));

// GET /:id - Get integration detail
router.get('/:id', requirePermission('admin:messaging:read'), asyncHandler(async (req: Request, res: Response) => {
  const integration = await MessagingIntegration.findById(req.params.id).select('-config.bot_token -config.signing_secret -config.client_secret');
  if (!integration) return res.status(404).json({ error: 'Not found' });
  res.json({ data: integration });
}));

// PUT /:id - Update integration
router.put('/:id', requirePermission('admin:messaging:write'), asyncHandler(async (req: Request, res: Response) => {
  const integration = await MessagingIntegration.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!integration) return res.status(404).json({ error: 'Not found' });
  res.json({ data: integration });
}));

// DELETE /:id - Remove integration
router.delete('/:id', requirePermission('admin:messaging:write'), asyncHandler(async (req: Request, res: Response) => {
  await MessagingIntegration.findByIdAndDelete(req.params.id);
  res.json({ message: 'Integration removed' });
}));

// POST /:id/test - Send test notification
router.post('/:id/test', requirePermission('admin:messaging:write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  await messagingService.sendNotification(tenantId, 'custom', {
    title: 'Test Notification',
    message: 'This is a test notification from CoheronERP.',
    fields: [{ label: 'Sent by', value: req.user?.email || 'unknown' }],
  });
  res.json({ message: 'Test notification sent' });
}));

// =================== Slack Endpoints ===================

// POST /slack/events - Slack Events API
router.post('/slack/events', asyncHandler(async (req: Request, res: Response) => {
  // URL verification challenge
  if (req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }
  logger.info(`Slack event: ${req.body.event?.type}`);
  res.status(200).send();
}));

// POST /slack/commands - Slack slash command handler
router.post('/slack/commands', asyncHandler(async (req: Request, res: Response) => {
  const { command, text, user_id, team_id } = req.body;
  const integration = await MessagingIntegration.findOne({ 'config.team_id': team_id, platform: 'slack' });
  if (!integration) return res.json({ text: 'Integration not configured' });
  const result = await messagingService.processSlashCommand('slack', command, text, user_id, integration.tenant_id);
  res.json(result);
}));

// POST /slack/interactions - Slack interactive component handler
router.post('/slack/interactions', asyncHandler(async (req: Request, res: Response) => {
  const payload = JSON.parse(req.body.payload || '{}');
  const result = await messagingService.handleSlackInteraction(payload);
  res.json(result);
}));

// GET /slack/oauth - Slack OAuth callback
router.get('/slack/oauth', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Authorization code required' });
  logger.info('Slack OAuth callback received');
  res.json({ message: 'Slack app installed successfully' });
}));

// =================== Teams Endpoints ===================

// POST /teams/webhook - Teams incoming webhook handler
router.post('/teams/webhook', asyncHandler(async (req: Request, res: Response) => {
  logger.info('Teams webhook received');
  res.status(200).send();
}));

// POST /teams/commands - Teams bot command handler
router.post('/teams/commands', asyncHandler(async (req: Request, res: Response) => {
  const { text, from } = req.body;
  const integration = await MessagingIntegration.findOne({ 'config.tenant_id_ms': req.body.tenantId, platform: 'teams' });
  if (!integration) return res.json({ text: 'Integration not configured' });
  const result = await messagingService.processSlashCommand('teams', '', text, from?.id, integration.tenant_id);
  res.json(result);
}));

// POST /teams/actions - Teams adaptive card action handler
router.post('/teams/actions', asyncHandler(async (req: Request, res: Response) => {
  const result = await messagingService.handleTeamsInteraction(req.body);
  res.json(result);
}));

// =================== Notification Management ===================

// GET /notifications - List notification log
router.get('/notifications', requirePermission('admin:messaging:read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const { platform, event_type, status, page = 1, limit = 50 } = req.query as any;
  const filter: any = { tenant_id: tenantId };
  if (platform) filter.platform = platform;
  if (event_type) filter.event_type = event_type;
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    MessagingNotificationLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)),
    MessagingNotificationLog.countDocuments(filter),
  ]);
  res.json({ data: logs, total, page: Number(page), limit: Number(limit) });
}));

// POST /notify - Manually send notification
router.post('/notify', requirePermission('admin:messaging:write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'Tenant ID required' });
  const { event_type, title, message, entity_type, entity_id, fields, actions } = req.body;
  await messagingService.sendNotification(tenantId, event_type || 'custom', {
    title, message, entity_type, entity_id, fields, actions,
  });
  res.json({ message: 'Notification sent to all configured channels' });
}));

// GET /events - List available event types
router.get('/events', requirePermission('admin:messaging:read'), (_req: Request, res: Response) => {
  const events = MESSAGING_EVENT_TYPES.map((e: string) => ({
    type: e,
    description: e.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
  }));
  res.json({ data: events });
});

export default router;
