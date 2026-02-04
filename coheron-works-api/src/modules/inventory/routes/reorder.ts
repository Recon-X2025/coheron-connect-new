import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import reorderService from '../../../services/reorderService.js';

const router = Router();

router.get('/suggestions', authenticate, asyncHandler(async (req: any, res: any) => {
  const suggestions = await reorderService.checkReorderPoints(req.user.tenant_id.toString());
  res.json(suggestions);
}));

router.post('/generate-pos', authenticate, asyncHandler(async (req: any, res: any) => {
  const { suggestions } = req.body;
  const pos = await reorderService.generatePurchaseOrdersFromSuggestions(req.user.tenant_id.toString(), suggestions || []);
  res.json({ created: pos.length });
}));

export default router;
