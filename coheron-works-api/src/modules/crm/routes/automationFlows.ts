import express from 'express';
import { AutomationFlow } from '../models/AutomationFlow.js';
import { FlowExecution } from '../models/FlowExecution.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

const FLOW_TEMPLATES = [
  { name: 'Lead Nurture', description: 'Automatically nurture new leads with a series of emails and follow-ups', trigger: { type: 'lead_created', config: {} }, nodes: [
    { id: 'n1', type: 'action', position: { x: 250, y: 100 }, config: { action: 'send_email', subject: 'Welcome!', template: 'welcome' }, next_nodes: ['n2'] },
    { id: 'n2', type: 'delay', position: { x: 250, y: 220 }, config: { days: 2 }, next_nodes: ['n3'] },
    { id: 'n3', type: 'condition', position: { x: 250, y: 340 }, config: { field: 'email_opened', operator: 'equals', value: true }, next_nodes: ['n4', 'n5'] },
    { id: 'n4', type: 'action', position: { x: 100, y: 460 }, config: { action: 'send_email', subject: 'Follow-up', template: 'follow_up' }, next_nodes: [] },
    { id: 'n5', type: 'action', position: { x: 400, y: 460 }, config: { action: 'create_task', title: 'Call lead' }, next_nodes: [] },
  ] },
  { name: 'Deal Follow-up', description: 'Follow up on deals that have been idle for too long', trigger: { type: 'time_based', config: { interval: 'daily' } }, nodes: [
    { id: 'n1', type: 'condition', position: { x: 250, y: 100 }, config: { field: 'days_since_update', operator: 'gt', value: 7 }, next_nodes: ['n2'] },
    { id: 'n2', type: 'action', position: { x: 250, y: 220 }, config: { action: 'send_email', subject: 'Checking in', template: 'deal_followup' }, next_nodes: ['n3'] },
    { id: 'n3', type: 'action', position: { x: 250, y: 340 }, config: { action: 'create_task', title: 'Follow up on stale deal' }, next_nodes: [] },
  ] },
  { name: 'Score-based Assignment', description: 'Auto-assign high-scoring leads to senior reps', trigger: { type: 'score_threshold', config: { threshold: 80 } }, nodes: [
    { id: 'n1', type: 'condition', position: { x: 250, y: 100 }, config: { field: 'score', operator: 'gt', value: 90 }, next_nodes: ['n2', 'n3'] },
    { id: 'n2', type: 'action', position: { x: 100, y: 220 }, config: { action: 'assign', team: 'enterprise' }, next_nodes: [] },
    { id: 'n3', type: 'action', position: { x: 400, y: 220 }, config: { action: 'assign', team: 'standard' }, next_nodes: [] },
  ] },
  { name: 'Welcome Sequence', description: 'Multi-touch welcome series for new form submissions', trigger: { type: 'form_submitted', config: {} }, nodes: [
    { id: 'n1', type: 'action', position: { x: 250, y: 100 }, config: { action: 'send_email', subject: 'Thanks for reaching out', template: 'welcome_1' }, next_nodes: ['n2'] },
    { id: 'n2', type: 'delay', position: { x: 250, y: 220 }, config: { days: 1 }, next_nodes: ['n3'] },
    { id: 'n3', type: 'action', position: { x: 250, y: 340 }, config: { action: 'send_email', subject: 'Getting started guide', template: 'welcome_2' }, next_nodes: ['n4'] },
    { id: 'n4', type: 'delay', position: { x: 250, y: 460 }, config: { days: 3 }, next_nodes: ['n5'] },
    { id: 'n5', type: 'action', position: { x: 250, y: 580 }, config: { action: 'create_task', title: 'Personal outreach call' }, next_nodes: [] },
  ] },
];

// GET all flows
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.status) filter.status = req.query.status;
  const flows = await AutomationFlow.find(filter).sort({ created_at: -1 }).lean();
  res.json(flows);
}));

// GET templates
router.get('/templates', authenticate, asyncHandler(async (_req, res) => {
  res.json(FLOW_TEMPLATES);
}));

// GET single flow
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const flow = await AutomationFlow.findById(req.params.id).lean();
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json(flow);
}));

// CREATE flow
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const flow = await AutomationFlow.create({ ...req.body, tenant_id: tenantId, created_by: userId });
  res.status(201).json(flow);
}));

// UPDATE flow
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const flow = await AutomationFlow.findByIdAndUpdate(req.params.id, { ...req.body, $inc: { version: 1 } }, { new: true });
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json(flow);
}));

// DELETE flow
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await AutomationFlow.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ACTIVATE flow
router.post('/:id/activate', authenticate, asyncHandler(async (req, res) => {
  const flow = await AutomationFlow.findByIdAndUpdate(req.params.id, { status: 'active' }, { new: true });
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json(flow);
}));

// PAUSE flow
router.post('/:id/pause', authenticate, asyncHandler(async (req, res) => {
  const flow = await AutomationFlow.findByIdAndUpdate(req.params.id, { status: 'paused' }, { new: true });
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json(flow);
}));

// TEST (dry run) flow with a lead
router.post('/:id/test', authenticate, asyncHandler(async (req, res) => {
  const flow = await AutomationFlow.findById(req.params.id).lean();
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  const tenantId = (req as any).user?.tenant_id;
  const leadId = req.body.lead_id;
  const log: any[] = [];
  for (const node of flow.nodes || []) {
    log.push({ node_id: node.id, action: `${node.type}: ${JSON.stringify(node.config)}`, result: 'simulated', timestamp: new Date() });
  }
  const execution = await FlowExecution.create({
    tenant_id: tenantId,
    flow_id: flow._id,
    lead_id: leadId,
    status: 'completed',
    started_at: new Date(),
    completed_at: new Date(),
    execution_log: log,
  });
  res.json({ dry_run: true, execution });
}));

// GET executions for a flow
router.get('/:id/executions', authenticate, asyncHandler(async (req, res) => {
  const executions = await FlowExecution.find({ flow_id: req.params.id }).sort({ started_at: -1 }).limit(100).lean();
  res.json(executions);
}));

export default router;
