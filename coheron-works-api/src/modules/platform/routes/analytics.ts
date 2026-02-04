import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import dashboardAnalyticsService from '../../../services/dashboardAnalyticsService.js';

const router = Router();

router.get('/sales', authenticate, asyncHandler(async (req: any, res: any) => {
  const data = await dashboardAnalyticsService.getSalesDashboard(req.user.tenant_id.toString());
  res.json(data);
}));

router.get('/finance', authenticate, asyncHandler(async (req: any, res: any) => {
  const data = await dashboardAnalyticsService.getFinanceDashboard(req.user.tenant_id.toString());
  res.json(data);
}));

router.get('/inventory', authenticate, asyncHandler(async (req: any, res: any) => {
  const data = await dashboardAnalyticsService.getInventoryDashboard(req.user.tenant_id.toString());
  res.json(data);
}));

export default router;
