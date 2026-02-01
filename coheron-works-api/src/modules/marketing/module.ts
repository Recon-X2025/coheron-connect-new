import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'marketing',
  description: 'Campaigns, email marketing, social, A/B testing, landing pages, SMS, journeys',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/campaigns', router: routes.campaigns },
    { path: '/marketing', router: routes.marketing },
    { path: '/marketing/social', router: routes.social },
    { path: '/marketing/ab-testing', router: routes.abTesting },
    { path: '/marketing/landing-pages', router: routes.landingPages },
    { path: '/marketing/campaign-analytics', router: routes.campaignAnalytics },
    { path: '/marketing/sms', router: routes.sms },
    { path: '/marketing/journeys', router: routes.journeys },
    { path: '/marketing/email-builder', router: routes.emailBuilder },
    { path: '/marketing/events', router: routes.events },
    { path: '/marketing/attribution', router: routes.attribution },
    { path: '/marketing/seo', router: routes.seo },
  ];
}
