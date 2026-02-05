import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { NLQueryEngine } from '../../../services/ai/NLQueryEngine.js';
import { DocumentIntelligence } from '../../../services/ai/DocumentIntelligence.js';
import { PredictiveAnalytics } from '../../../services/ai/PredictiveAnalytics.js';
import { SmartAutomation } from '../../../services/ai/SmartAutomation.js';
import { AIService } from '../../../services/aiService.js';
import multer from 'multer';

const router = Router();
router.use(authenticate);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /ai/query - Natural language query
router.post('/query', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const { query, context } = req.body;

  if (!query) return res.status(400).json({ error: 'query is required' });
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });

  const result = await NLQueryEngine.executeNLQuery(tenantId, userId, query);
  res.json(result);
}));

// POST /ai/document-extract - OCR + extraction
router.post('/document-extract', upload.single('file'), asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;

  if (!req.file && !req.body.text) {
    return res.status(400).json({ error: 'Upload a file or provide text in body' });
  }

  try {
    let result;
    if (req.file) {
      result = await DocumentIntelligence.extractFromImage(req.file.buffer, tenantId);
    } else {
      const structured = await DocumentIntelligence.extractFromText(req.body.text, tenantId);
      result = { extracted_text: req.body.text, structured_data: structured, confidence: 100 };
    }
    res.json(result);
  } catch (err: any) {
    const message = err?.message || 'Document extraction failed';
    res.status(500).json({
      error: message.includes('worker') || message.includes('Tesseract')
        ? 'OCR engine failed to process this file. Ensure the image is clear and try again.'
        : message,
    });
  }
}));

// GET /ai/insights - Get AI insights for tenant
router.get('/insights', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });

  const { module } = req.query;

  // Generate fresh insights
  const count = await AIService.generateInsights(tenantId);

  // Also get forecast and cash flow
  const [forecast, cashFlow] = await Promise.all([
    PredictiveAnalytics.demandForecast(tenantId, undefined, 6),
    PredictiveAnalytics.cashFlowProjection(tenantId, 3),
  ]);

  res.json({
    insights_generated: count,
    forecast,
    cash_flow: cashFlow,
  });
}));

// POST /ai/suggest-automation
router.post('/suggest-automation', asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });

  const suggestions = await SmartAutomation.suggestRules(tenantId);
  res.json({ suggestions });
}));

export default router;
