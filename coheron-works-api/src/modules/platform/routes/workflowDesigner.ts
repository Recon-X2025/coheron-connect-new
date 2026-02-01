import express from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

// ── Visual Workflow Schema ──────────────────────────────────────────

export interface IWorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay' | 'loop';
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface IWorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface IVisualWorkflow extends Document {
  tenant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  nodes: IWorkflowNode[];
  edges: IWorkflowEdge[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  trigger_type?: string;
  last_run_at?: Date;
  run_count: number;
  created_by: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

const visualWorkflowSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  nodes: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['trigger', 'action', 'condition', 'delay', 'loop'], required: true },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    data: { type: Schema.Types.Mixed, default: {} },
  }],
  edges: [{
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    label: String,
  }],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  version: { type: Number, default: 1 },
  trigger_type: String,
  last_run_at: Date,
  run_count: { type: Number, default: 0 },
  created_by: { type: Schema.Types.ObjectId },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const VisualWorkflow = (mongoose.models.VisualWorkflow as mongoose.Model<IVisualWorkflow>) || mongoose.model<IVisualWorkflow>('VisualWorkflow', visualWorkflowSchema);

// ── Routes ──────────────────────────────────────────────────────────

const router = express.Router();

// List visual workflows
router.get('/', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { status, page = '1', limit = '20' } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [workflows, total] = await Promise.all([
    VisualWorkflow.find(filter).sort({ updated_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    VisualWorkflow.countDocuments(filter),
  ]);
  res.json({ workflows, total, page: Number(page), limit: Number(limit) });
}));

// Create workflow
router.post('/', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const user_id = (req as any).user?._id;
  const { name, description, nodes, edges, trigger_type } = req.body;
  const workflow = await VisualWorkflow.create({
    tenant_id, name, description, nodes: nodes || [], edges: edges || [],
    trigger_type, created_by: user_id, status: 'draft',
  });
  res.status(201).json(workflow);
}));

// Get single workflow
router.get('/:id', asyncHandler(async (req, res) => {
  const workflow = await VisualWorkflow.findById(req.params.id).lean();
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
}));

// Update workflow graph
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, description, nodes, edges, trigger_type } = req.body;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (nodes !== undefined) update.nodes = nodes;
  if (edges !== undefined) update.edges = edges;
  if (trigger_type !== undefined) update.trigger_type = trigger_type;
  const workflow = await VisualWorkflow.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).lean();
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
}));

// Publish workflow
router.post('/:id/publish', asyncHandler(async (req, res) => {
  const workflow = await VisualWorkflow.findById(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  if (workflow.nodes.length === 0) return res.status(400).json({ error: 'Workflow has no nodes' });
  const hasTrigger = workflow.nodes.some(n => n.type === 'trigger');
  if (!hasTrigger) return res.status(400).json({ error: 'Workflow must have at least one trigger node' });
  workflow.status = 'published';
  workflow.version += 1;
  await workflow.save();
  res.json(workflow);
}));

// Dry-run test
router.post('/:id/test', asyncHandler(async (req, res) => {
  const workflow = await VisualWorkflow.findById(req.params.id).lean();
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

  const { test_data = {} } = req.body;
  const executionLog: { node_id: string; type: string; status: string; output?: any }[] = [];

  // Simulate execution by traversing nodes via edges
  const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }

  // Find trigger nodes (entry points)
  const triggerNodes = workflow.nodes.filter(n => n.type === 'trigger');
  const visited = new Set<string>();
  const queue = triggerNodes.map(n => n.id);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    let status = 'success';
    let output: any = undefined;

    if (node.type === 'condition') {
      output = { branch: 'true', reason: 'Test mode: always takes true branch' };
    } else if (node.type === 'delay') {
      output = { delayed: node.data.duration || '0s', skipped: true, reason: 'Skipped in test mode' };
    } else if (node.type === 'action') {
      output = { action: node.data.action_type || 'unknown', simulated: true };
    } else if (node.type === 'trigger') {
      output = { triggered_with: test_data };
    }

    executionLog.push({ node_id: nodeId, type: node.type, status, output });

    const next = adjacency.get(nodeId) || [];
    for (const n of next) queue.push(n);
  }

  // Update run count
  await VisualWorkflow.findByIdAndUpdate(workflow._id, { $inc: { run_count: 1 }, $set: { last_run_at: new Date() } });

  res.json({
    workflow_id: workflow._id,
    test: true,
    nodes_executed: executionLog.length,
    total_nodes: workflow.nodes.length,
    execution_log: executionLog,
  });
}));

export default router;
