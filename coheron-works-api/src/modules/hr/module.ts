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
  description: 'Human Resources: employees, attendance, leave, payroll, appraisals, goals, courses, applicants, policies, tax compliance, self-service, shifts, org chart, expenses, payroll localization, lifecycle',
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
    { path: '/hr/tax', router: routes.taxCompliance },
    { path: '/hr/self-service', router: routes.selfService },
    { path: '/hr/shifts', router: routes.shifts },
    { path: '/hr/org-chart', router: routes.orgChart },
    { path: '/hr/expenses', router: routes.expenses },
    { path: '/hr/payroll-localization', router: routes.payrollLocalization },
    { path: '/hr/lifecycle', router: routes.lifecycle },
    { path: '/hr/biometric', router: routes.biometric },
    { path: '/hr/full-final-settlement', router: routes.fullFinalSettlement },
    { path: '/hr/leave-encashment', router: routes.leaveEncashment },
    { path: '/hr/compensation', router: routes.compensation },
    { path: '/hr/succession', router: routes.succession },
    { path: '/hr/benefits', router: routes.benefits },
    { path: '/hr/ats', router: routes.ats },
    { path: '/hr/lms', router: routes.lms },
  ];
}
