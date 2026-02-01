import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'projects',
  description: 'Project management, agile, wiki, quality, resources, procurement, financials, risks, issues, and gantt',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/projects', router: routes.projects },
    { path: '/projects', router: routes.projectTasks },
    { path: '/projects', router: routes.projectTimesheets },
    { path: '/projects', router: routes.projectAgile },
    { path: '/projects', router: routes.projectAnalytics },
    { path: '/projects', router: routes.projectWiki },
    { path: '/projects', router: routes.projectQuality },
    { path: '/projects', router: routes.projectResources },
    { path: '/projects', router: routes.projectProcurement },
    { path: '/projects', router: routes.projectFinancials },
    { path: '/projects', router: routes.projectRisksIssues },
    { path: '/projects', router: routes.projectChangeRequests },
    { path: '/projects', router: routes.wikiTemplates },
    { path: '/projects', router: routes.sprintPlanning },
    { path: '/projects', router: routes.sprintRetrospectives },
    { path: '/projects', router: routes.backlogManagement },
    { path: '/projects', router: routes.bugLifecycle },
    { path: '/projects', router: routes.agileAnalytics },
    { path: '/issue-types', router: routes.issueTypes },
    { path: '/issue-comments', router: routes.issueComments },
    { path: '/issue-attachments', router: routes.issueAttachments },
    { path: '/projects/gantt', router: routes.gantt },
    { path: '/projects/okrs', router: routes.okrs },
    { path: '/projects/automation-rules', router: routes.automationRules },
  ];
}
