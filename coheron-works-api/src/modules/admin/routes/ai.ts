import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import AIQuery from '../../../models/AIQuery.js';
import AIInsight from '../../../models/AIInsight.js';
import { AIService } from '../../../services/aiService.js';

const router = express.Router();

// POST /query - Submit natural language query
router.post('/query', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const userId = req.user?._id || req.user?.id;
  const { query_text, context } = req.body;
  if (!query_text) return res.status(400).json({ error: 'query_text is required' });
  const result = await AIService.processQuery(String(tenantId), String(userId), query_text, context);
  res.json({ success: true, data: result });
}));

// GET /insights - Get unread insights
router.get('/insights', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const { module, insight_type, severity, include_dismissed } = req.query;
  const filter: any = { tenant_id: tenantId };
  if (module) filter.module = module;
  if (insight_type) filter.insight_type = insight_type;
  if (severity) filter.severity = severity;
  if (include_dismissed !== 'true') filter.is_dismissed = false;
  const params = getPaginationParams(req);
  const result = await paginateQuery(AIInsight.find(filter).sort({ created_at: -1 }).lean(), params, filter, AIInsight);
  res.json(result);
}));

// POST /insights/:id/dismiss
router.post('/insights/:id/dismiss', asyncHandler(async (req: any, res) => {
  const insight = await AIInsight.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { is_dismissed: true, is_read: true },
    { new: true }
  );
  if (!insight) return res.status(404).json({ error: 'Insight not found' });
  res.json({ success: true, data: insight });
}));

// POST /insights/:id/feedback
router.post('/insights/:id/feedback', asyncHandler(async (req: any, res) => {
  const { feedback } = req.body;
  if (!['helpful', 'not_helpful'].includes(feedback)) return res.status(400).json({ error: 'feedback must be helpful or not_helpful' });
  const insight = await AIInsight.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { is_read: true },
    { new: true }
  );
  if (!insight) return res.status(404).json({ error: 'Insight not found' });
  res.json({ success: true, data: insight });
}));

// GET /anomalies - Run anomaly detection
router.get('/anomalies', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const module = (req.query.module as string) || 'sales';
  const result = await AIService.detectAnomalies(String(tenantId), module);
  res.json({ success: true, data: result });
}));

// GET /forecast/:module
router.get('/forecast/:module', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const periods = parseInt(req.query.periods as string) || 6;
  const productId = req.query.product_id as string | undefined;
  const data = await AIService.generateSalesForecast(String(tenantId), productId, periods);
  res.json({ success: true, data });
}));

// GET /recommendations/:module
router.get('/recommendations/:module', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const result = await AIService.getSmartRecommendations(String(tenantId), req.params.module);
  res.json({ success: true, data: result });
}));

// POST /generate-insights - Trigger insight generation
router.post('/generate-insights', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const count = await AIService.generateInsights(String(tenantId));
  res.json({ success: true, data: { insights_created: count } });
}));

// GET /queries - Query history
router.get('/queries', asyncHandler(async (req: any, res) => {
  const tenantId = req.user?.tenant_id;
  const userId = req.user?._id || req.user?.id;
  const filter: any = { tenant_id: tenantId, user_id: userId };
  if (req.query.query_type) filter.query_type = req.query.query_type;
  const params = getPaginationParams(req);
  const result = await paginateQuery(AIQuery.find(filter).sort({ created_at: -1 }).lean(), params, filter, AIQuery);
  res.json(result);
}));

export default router;
