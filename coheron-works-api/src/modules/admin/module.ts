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
  description: 'Authentication, RBAC, tenant configuration, SSO, data import, studio, messaging, compliance',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/auth', router: routes.auth },
    { path: '/auth/2fa', router: routes.twoFactor },
    { path: '/rbac', router: routes.rbac },
    { path: '/tenant-config', router: routes.tenantConfig },
    { path: '/activities', router: routes.activities },
    { path: '/admin/sso', router: routes.sso },
    { path: '/admin/import', router: routes.dataImport },
    { path: '/admin/ai', router: routes.ai },
    { path: '/admin/studio', router: routes.studio },
    { path: '/admin/extensions', router: routes.extensions },
    { path: '/admin/messaging', router: routes.messaging },
    { path: '/compliance-framework', router: routes.complianceFramework },
    { path: '/pricing-plans', router: routes.pricingPlans },
    { path: '/module-prices', router: routes.modulePrices },
  ];
}
