import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { GSTFilingService } from '../../../services/compliance/GSTFilingService.js';

const router = Router();

router.post('/gstr1/generate', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const { period } = req.body; // "2024-01" format
  if (!period) return res.status(400).json({ error: 'period is required (YYYY-MM)' });
  const result = await GSTFilingService.generateGSTR1(tenantId, period);
  res.json(result);
}));

router.post('/gstr3b/generate', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const { period } = req.body;
  if (!period) return res.status(400).json({ error: 'period is required (YYYY-MM)' });
  const result = await GSTFilingService.generateGSTR3B(tenantId, period);
  res.json(result);
}));

export default router;
