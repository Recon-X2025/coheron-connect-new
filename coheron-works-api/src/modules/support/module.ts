import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'support',
  description: 'Support tickets, teams, SLA, knowledge base, ITSM, live chat',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/support/tickets', router: routes.supportTickets },
    { path: '/support/teams', router: routes.supportTeams },
    { path: '/support/chat', router: routes.supportChat },
    { path: '/support/surveys', router: routes.supportSurveys },
    { path: '/support/automation', router: routes.supportAutomation },
    { path: '/support/reports', router: routes.supportReports },
    { path: '/sla-policies', router: routes.slaPolicies },
    { path: '/canned-responses', router: routes.cannedResponses },
    { path: '/knowledge-base', router: routes.knowledgeBase },
    { path: '/itsm', router: routes.itsm },
    { path: '/live-chat', router: routes.liveChat },
  ];
}
