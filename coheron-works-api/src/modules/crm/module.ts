import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'crm',
  description: 'CRM: leads, deals, pipelines, tasks, calendar, automation, RFM analysis, RBAC, email threads',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/leads', router: routes.leads },
    { path: '/deals', router: routes.deals },
    { path: '/pipelines', router: routes.pipelines },
    { path: '/crm', router: routes.crm },
    { path: '/crm-rbac', router: routes.crmRbac },
    { path: '/crm/rfm', router: routes.rfm },
    { path: '/crm/email-threads', router: routes.emailThreads },
    { path: '/crm/ai-scoring', router: routes.aiScoring },
    { path: '/crm/territories', router: routes.territories },
    { path: '/crm/cpq', router: routes.cpq },
    { path: '/crm/forecasting', router: routes.forecasting },
  ];
}
