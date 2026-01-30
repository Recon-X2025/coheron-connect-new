import express from 'express';
import { Pipeline } from '../models/Pipeline.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// Get all pipelines
router.get('/', asyncHandler(async (req, res) => {
  const { tenant_id } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;

  const pipelines = await Pipeline.find(filter).sort({ created_at: -1 }).lean();
  res.json(pipelines);
}));

// Get pipeline by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findById(req.params.id).lean();
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json(pipeline);
}));

// Create pipeline
router.post('/', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.create(req.body);
  res.status(201).json(pipeline);
}));

// Update pipeline
router.put('/:id', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json(pipeline);
}));

// Delete pipeline
router.delete('/:id', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findByIdAndDelete(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json({ message: 'Pipeline deleted successfully' });
}));

// Add stage to pipeline
router.post('/:id/stages', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findByIdAndUpdate(
    req.params.id,
    { $push: { stages: req.body } },
    { new: true }
  );
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json(pipeline);
}));

// Update stage
router.put('/:id/stages/:stageId', asyncHandler(async (req, res) => {
  const update: any = {};
  for (const [key, value] of Object.entries(req.body)) {
    update[`stages.$.${key}`] = value;
  }

  const pipeline = await Pipeline.findOneAndUpdate(
    { _id: req.params.id, 'stages._id': req.params.stageId },
    { $set: update },
    { new: true }
  );
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline or stage not found' });
  }
  res.json(pipeline);
}));

// Delete stage
router.delete('/:id/stages/:stageId', asyncHandler(async (req, res) => {
  const pipeline = await Pipeline.findByIdAndUpdate(
    req.params.id,
    { $pull: { stages: { _id: req.params.stageId } } },
    { new: true }
  );
  if (!pipeline) {
    return res.status(404).json({ error: 'Pipeline not found' });
  }
  res.json(pipeline);
}));

export default router;
