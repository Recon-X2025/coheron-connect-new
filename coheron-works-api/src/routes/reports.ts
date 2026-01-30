import express from 'express';
import { Report } from '../models/Report.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { module, tenant_id } = req.query;
  const filter: any = {};
  if (module) filter.module = module;
  if (tenant_id) filter.tenant_id = tenant_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Report.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, Report
  );
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).lean();
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
}));

router.post('/', asyncHandler(async (req, res) => {
  const report = await Report.create(req.body);
  res.status(201).json(report);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({ message: 'Report deleted successfully' });
}));

export default router;
