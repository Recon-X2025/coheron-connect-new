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
  name: 'platform',
  description: 'Workflows, integrations, reports, dashboards, custom fields',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/workflows', router: routes.workflows, middleware: [requireModule('platform')], },
    { path: '/integrations', router: routes.integrations, middleware: [requireModule('platform')], },
    { path: '/reports', router: routes.reports, middleware: [requireModule('platform')], },
    { path: '/dashboards', router: routes.dashboards, middleware: [requireModule('platform')], },
    { path: '/custom-fields', router: routes.customFields, middleware: [requireModule('platform')], },
  ];
}
