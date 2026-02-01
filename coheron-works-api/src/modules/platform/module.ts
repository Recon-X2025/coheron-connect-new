import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'platform',
  description: 'Workflows, integrations, reports, dashboards, custom fields, compliance, security, analytics',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/workflows', router: routes.workflows },
    { path: '/integrations', router: routes.integrations },
    { path: '/reports', router: routes.reports },
    { path: '/dashboards', router: routes.dashboards },
    { path: '/custom-fields', router: routes.customFields },
    { path: '/consent', router: routes.consent, public: true },
    { path: '/dsar', router: routes.dsar },
    { path: '/compliance', router: routes.compliance },
    { path: '/security-dashboard', router: routes.securityDashboard },
    { path: '/document-sequences', router: routes.documentSequences },
    { path: '/analytics', router: routes.analytics },
    { path: '/platform/localization', router: routes.localization },
    { path: '/platform/workflow-designer', router: routes.workflowDesigner },
    { path: '/marketplace', router: routes.marketplace },
  ];
}
