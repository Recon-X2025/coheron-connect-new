import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'hr',
  description: 'Human Resources: employees, attendance, leave, payroll, appraisals, goals, courses, applicants, policies, tax compliance',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/employees', router: routes.employees },
    { path: '/attendance', router: routes.attendance },
    { path: '/leave', router: routes.leave },
    { path: '/payroll', router: routes.payroll },
    { path: '/appraisals', router: routes.appraisals },
    { path: '/goals', router: routes.goals },
    { path: '/courses', router: routes.courses },
    { path: '/applicants', router: routes.applicants },
    { path: '/policies', router: routes.policies },
    { path: '/tax-compliance', router: routes.taxCompliance },
  ];
}
