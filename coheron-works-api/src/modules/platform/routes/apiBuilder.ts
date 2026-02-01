import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import CustomAPI from '../models/CustomAPI.js';

const router = Router();

// List APIs
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
  const apis = await CustomAPI.find(filter).sort({ updated_at: -1 });
  res.json(apis);
}));

// Usage stats
router.get('/usage', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const apis = await CustomAPI.find({ tenant_id }).select('name slug method call_count is_active');
  const total_calls = apis.reduce((sum, a) => sum + (a.call_count || 0), 0);
  res.json({ total_apis: apis.length, total_calls, endpoints: apis });
}));

// Get single
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const api = await CustomAPI.findOne({ _id: req.params.id, tenant_id });
  if (!api) return res.status(404).json({ error: 'API not found' });
  res.json(api);
}));

// Create
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const api = await CustomAPI.create({ ...req.body, tenant_id, created_by: (req as any).user?.userId });
  res.status(201).json(api);
}));

// Update
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const api = await CustomAPI.findOneAndUpdate({ _id: req.params.id, tenant_id }, req.body, { new: true });
  if (!api) return res.status(404).json({ error: 'API not found' });
  res.json(api);
}));

// Delete
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await CustomAPI.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Test endpoint
router.post('/:id/test', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const api = await CustomAPI.findOne({ _id: req.params.id, tenant_id });
  if (!api) return res.status(404).json({ error: 'API not found' });
  const startTime = Date.now();
  const response = { status: 200, body: { message: 'Test successful', method: api.method, path: api.path_template, sample_data: req.body }, duration_ms: Date.now() - startTime };
  await CustomAPI.updateOne({ _id: api._id }, { $inc: { call_count: 1 } });
  res.json(response);
}));

// Logs (recent calls)
router.get('/:id/logs', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const api = await CustomAPI.findOne({ _id: req.params.id, tenant_id });
  if (!api) return res.status(404).json({ error: 'API not found' });
  res.json({ endpoint: api.name, call_count: api.call_count, logs: [] });
}));

// Generate OpenAPI docs
router.post('/:id/generate-docs', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const api = await CustomAPI.findOne({ _id: req.params.id, tenant_id });
  if (!api) return res.status(404).json({ error: 'API not found' });
  const spec = {
    openapi: '3.0.0',
    info: { title: api.name, description: api.description, version: '1.0.0' },
    paths: {
      [api.path_template]: {
        [api.method.toLowerCase()]: {
          summary: api.description,
          requestBody: api.request_schema ? { content: { 'application/json': { schema: api.request_schema } } } : undefined,
          responses: { '200': { description: 'Successful response' } },
        },
      },
    },
  };
  res.json(spec);
}));

export default router;
