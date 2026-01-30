import express from 'express';
import { Integration } from '../../../models/Integration.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { type, is_active, tenant_id } = req.query;
  const filter: any = {};
  if (type) filter.type = type;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  if (tenant_id) filter.tenant_id = tenant_id;

  const integrations = await Integration.find(filter).sort({ created_at: -1 }).lean();
  res.json(integrations);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const integration = await Integration.findById(req.params.id).lean();
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  res.json(integration);
}));

router.post('/', asyncHandler(async (req, res) => {
  const integration = await Integration.create(req.body);
  res.status(201).json(integration);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const integration = await Integration.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  res.json(integration);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const integration = await Integration.findByIdAndDelete(req.params.id);
  if (!integration) return res.status(404).json({ error: 'Integration not found' });
  res.json({ message: 'Integration deleted successfully' });
}));

export default router;
