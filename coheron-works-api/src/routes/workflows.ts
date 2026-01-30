import express from 'express';
import { Workflow } from '../models/Workflow.js';
import { WorkflowRun } from '../models/WorkflowRun.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { module, is_active, tenant_id } = req.query;
  const filter: any = {};
  if (module) filter.module = module;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (tenant_id) filter.tenant_id = tenant_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Workflow.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, Workflow
  );
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const workflow = await Workflow.findById(req.params.id).lean();
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
}));

router.post('/', asyncHandler(async (req, res) => {
  const workflow = await Workflow.create(req.body);
  res.status(201).json(workflow);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const workflow = await Workflow.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json(workflow);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const workflow = await Workflow.findByIdAndDelete(req.params.id);
  if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
  res.json({ message: 'Workflow deleted successfully' });
}));

router.get('/:id/runs', asyncHandler(async (req, res) => {
  const runs = await WorkflowRun.find({ workflow_id: req.params.id }).sort({ created_at: -1 }).limit(50).lean();
  res.json(runs);
}));

export default router;
