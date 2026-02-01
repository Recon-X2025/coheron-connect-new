import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import VisualWorkflow from '../models/VisualWorkflow.js';
import WorkflowExecution from '../models/WorkflowExecution.js';

const router = Router();

// List workflows
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { status, type, search } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const workflows = await VisualWorkflow.find(filter).sort({ updated_at: -1 });
  res.json(workflows);
}));

// Get templates
router.get('/templates', asyncHandler(async (_req: Request, res: Response) => {
  const templates = [
    { id: 'approval_flow', name: 'Approval Flow', description: 'Multi-level approval with escalation', type: 'approval', nodes: [
      { id: 'start', type: 'start', label: 'Start', position: { x: 100, y: 100 }, config: {} },
      { id: 'approval1', type: 'approval', label: 'Manager Approval', position: { x: 300, y: 100 }, config: { approver_role: 'manager', timeout_hours: 48 } },
      { id: 'decision1', type: 'decision', label: 'Approved?', position: { x: 500, y: 100 }, config: {} },
    ], edges: [{ id: 'e1', source: 'start', target: 'approval1' }, { id: 'e2', source: 'approval1', target: 'decision1' }] },
    { id: 'record_update', name: 'Record Update', description: 'Update records when conditions are met', type: 'record_triggered', nodes: [
      { id: 'start', type: 'start', label: 'Record Changed', position: { x: 100, y: 100 }, config: {} },
      { id: 'decision1', type: 'decision', label: 'Check Conditions', position: { x: 300, y: 100 }, config: {} },
      { id: 'action1', type: 'action', label: 'Update Record', position: { x: 500, y: 100 }, config: { action: 'update' } },
    ], edges: [{ id: 'e1', source: 'start', target: 'decision1' }, { id: 'e2', source: 'decision1', target: 'action1' }] },
    { id: 'email_notification', name: 'Email Notification', description: 'Send email alerts on events', type: 'record_triggered', nodes: [], edges: [] },
    { id: 'escalation', name: 'Escalation', description: 'Auto-escalate stale items', type: 'scheduled', nodes: [], edges: [] },
    { id: 'data_enrichment', name: 'Data Enrichment', description: 'Enrich records with external data', type: 'platform_event', nodes: [], edges: [] },
    { id: 'scheduled_cleanup', name: 'Scheduled Cleanup', description: 'Periodically clean up old records', type: 'scheduled', nodes: [], edges: [] },
  ];
  res.json(templates);
}));

// Get stats
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [total, active, executionsToday, errors] = await Promise.all([
    VisualWorkflow.countDocuments({ tenant_id }),
    VisualWorkflow.countDocuments({ tenant_id, status: 'active' }),
    WorkflowExecution.countDocuments({ tenant_id, started_at: { $gte: today } }),
    WorkflowExecution.countDocuments({ tenant_id, status: 'failed', started_at: { $gte: today } }),
  ]);
  res.json({ total, active, executions_today: executionsToday, error_rate: executionsToday > 0 ? (errors / executionsToday * 100).toFixed(1) : 0 });
}));

// Get single workflow
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const wf = await VisualWorkflow.findOne({ _id: req.params.id, tenant_id });
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Create workflow
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const wf = await VisualWorkflow.create({ ...req.body, tenant_id, created_by: (req as any).user?.userId });
  res.status(201).json(wf);
}));

// Update workflow
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const wf = await VisualWorkflow.findOneAndUpdate({ _id: req.params.id, tenant_id }, req.body, { new: true });
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Delete workflow
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await VisualWorkflow.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Activate
router.post('/:id/activate', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const wf = await VisualWorkflow.findOneAndUpdate({ _id: req.params.id, tenant_id }, { status: 'active' }, { new: true });
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Deactivate
router.post('/:id/deactivate', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const wf = await VisualWorkflow.findOneAndUpdate({ _id: req.params.id, tenant_id }, { status: 'inactive' }, { new: true });
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  res.json(wf);
}));

// Test (dry run)
router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const wf = await VisualWorkflow.findOne({ _id: req.params.id, tenant_id });
  if (!wf) return res.status(404).json({ error: 'Workflow not found' });
  const startTime = Date.now();
  const executionPath = wf.nodes.map(node => ({
    node_id: node.id,
    entered_at: new Date(),
    exited_at: new Date(),
    result: { dry_run: true, status: 'simulated' },
  }));
  const duration_ms = Date.now() - startTime;
  const execution = await WorkflowExecution.create({
    tenant_id, workflow_id: wf._id, triggered_by: (req as any).user?.userId,
    status: 'completed', started_at: new Date(startTime), completed_at: new Date(),
    duration_ms, execution_path: executionPath, variables_snapshot: req.body.variables || {},
  });
  res.json(execution);
}));

// Get executions
router.get('/:id/executions', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const executions = await WorkflowExecution.find({ tenant_id, workflow_id: req.params.id }).sort({ started_at: -1 }).limit(50);
  res.json(executions);
}));

// Debug execution
router.get('/:id/debug/:executionId', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const execution = await WorkflowExecution.findOne({ _id: req.params.executionId, tenant_id, workflow_id: req.params.id });
  if (!execution) return res.status(404).json({ error: 'Execution not found' });
  const workflow = await VisualWorkflow.findById(req.params.id);
  res.json({ execution, workflow_snapshot: workflow ? { nodes: workflow.nodes, edges: workflow.edges } : null });
}));

export default router;
