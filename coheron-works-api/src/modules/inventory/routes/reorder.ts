import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import reorderService from '../../../services/reorderService.js';

const router = Router();

router.get('/suggestions', asyncHandler(async (req: any, res: any) => {
  const suggestions = await reorderService.checkReorderPoints(req.user.tenant_id.toString());
  res.json(suggestions);
}));

router.post('/generate-pos', asyncHandler(async (req: any, res: any) => {
  const { suggestions } = req.body;
  const pos = await reorderService.generatePurchaseOrdersFromSuggestions(req.user.tenant_id.toString(), suggestions || []);
  res.json({ created: pos.length });
}));

export default router;
