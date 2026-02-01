import { Router } from 'express';
import { requireModule } from '../../shared/middleware/moduleGuard.js';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'pos',
  description: 'Point of Sale terminals, sessions, orders, payments',
  dependencies: ['inventory', 'sales'],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/pos', router: routes.pos, middleware: [requireModule('pos')], },
    { path: '/pos/tablet', router: routes.posTablet, middleware: [requireModule('pos')], },
    { path: '/pos/loyalty', router: routes.loyalty, middleware: [requireModule('pos')] },
    { path: '/pos/kitchen', router: routes.kitchenDisplay, middleware: [requireModule('pos')] },
    { path: '/pos/stores', router: routes.multiStore, middleware: [requireModule('pos')] },
    { path: '/pos/payment-gateways', router: routes.paymentGateways, middleware: [requireModule('pos')] },
    { path: '/pos/hardware', router: routes.hardwareIntegration, middleware: [requireModule('pos')] },
    { path: '/pos/offline-sync', router: routes.offlineSync, middleware: [requireModule('pos')] },
    { path: '/pos/analytics', router: routes.posAnalytics, middleware: [requireModule('pos')] },
  ];
}
