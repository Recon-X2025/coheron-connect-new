import express from 'express';
import { Dashboard } from '../../../models/Dashboard.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { tenant_id, created_by } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (created_by) filter.created_by = created_by;

  const dashboards = await Dashboard.find(filter).sort({ created_at: -1 }).lean();
  res.json(dashboards);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const dashboard = await Dashboard.findById(req.params.id)
    .populate('widgets.report_id', 'name module entity')
    .lean();
  if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
  res.json(dashboard);
}));

router.post('/', asyncHandler(async (req, res) => {
  const dashboard = await Dashboard.create(req.body);
  res.status(201).json(dashboard);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const dashboard = await Dashboard.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
  res.json(dashboard);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const dashboard = await Dashboard.findByIdAndDelete(req.params.id);
  if (!dashboard) return res.status(404).json({ error: 'Dashboard not found' });
  res.json({ message: 'Dashboard deleted successfully' });
}));

export default router;
