import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import dashboardAnalyticsService from '../../../services/dashboardAnalyticsService.js';

const router = Router();

router.get('/sales', asyncHandler(async (req: any, res: any) => {
  const data = await dashboardAnalyticsService.getSalesDashboard(req.user.tenant_id.toString());
  res.json(data);
}));

router.get('/finance', asyncHandler(async (req: any, res: any) => {
  const data = await dashboardAnalyticsService.getFinanceDashboard(req.user.tenant_id.toString());
  res.json(data);
}));

router.get('/inventory', asyncHandler(async (req: any, res: any) => {
  const data = await dashboardAnalyticsService.getInventoryDashboard(req.user.tenant_id.toString());
  res.json(data);
}));

export default router;
