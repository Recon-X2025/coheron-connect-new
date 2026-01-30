import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'manufacturing',
  description: 'Manufacturing orders, BOM, routing, work orders, quality, costing, and MRP',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/manufacturing', router: routes.manufacturing },
    { path: '/manufacturing/bom', router: routes.manufacturingBom },
    { path: '/manufacturing/routing', router: routes.manufacturingRouting },
    { path: '/manufacturing/work-orders', router: routes.manufacturingWorkOrders },
    { path: '/manufacturing/quality', router: routes.manufacturingQuality },
    { path: '/manufacturing/costing', router: routes.manufacturingCosting },
    { path: '/mrp', router: routes.mrp },
  ];
}
