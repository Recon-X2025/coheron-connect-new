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
  ];
}
