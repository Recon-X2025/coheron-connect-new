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
  description: 'Manufacturing orders, BOM, routing, work orders, quality, costing, MRP, subcontracting, capacity, scheduling, IoT',
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
    { path: '/manufacturing/mrp', router: routes.mrp },
    { path: '/manufacturing/subcontracting', router: routes.subcontracting },
    { path: '/manufacturing/capacity', router: routes.capacityPlanning },
    { path: '/manufacturing/mps', router: routes.mps },
    { path: '/manufacturing/shop-floor', router: routes.shopFloor },
    { path: '/manufacturing/scheduling', router: routes.scheduling },
    { path: '/manufacturing/work-instructions', router: routes.workInstructions },
    { path: '/manufacturing/iot', router: routes.iot },
    { path: '/manufacturing/plm', router: routes.plm },
    { path: '/manufacturing/preventive-maintenance', router: routes.preventiveMaintenance },
    { path: '/manufacturing/process', router: routes.processManufacturing },
    { path: '/manufacturing/byproducts', router: routes.byproducts },
    { path: '/manufacturing/kanban', router: routes.kanban },
    { path: '/manufacturing/advanced-quality', router: routes.advancedQuality },
    { path: '/manufacturing/cost-rollup', router: routes.costRollup },
    { path: '/manufacturing/fmea', router: routes.fmea },
  ];
}
