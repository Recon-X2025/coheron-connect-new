import { Router } from 'express';
import * as routes from './routes/index.js';
import { requireModule } from '../../shared/middleware/moduleGuard.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'inventory',
  description: 'Inventory management, products, stock reservations, and partners',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/inventory', router: routes.inventory, middleware: [requireModule('inventory')] },
    { path: '/products', router: routes.products, middleware: [requireModule('inventory')] },
    { path: '/stock-reservations', router: routes.stockReservations, middleware: [requireModule('inventory')] },
    { path: '/partners', router: routes.partners },
  ];
}
