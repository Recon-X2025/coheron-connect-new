import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'admin',
  description: 'Authentication, RBAC, tenant configuration',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/auth', router: routes.auth },
    { path: '/auth/2fa', router: routes.twoFactor },
    { path: '/rbac', router: routes.rbac },
    { path: '/tenant-config', router: routes.tenantConfig },
    { path: '/activities', router: routes.activities },
  ];
}
