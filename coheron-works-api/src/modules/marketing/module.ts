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
  description: 'Campaigns and marketing workflows',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/campaigns', router: routes.campaigns },
    { path: '/marketing', router: routes.marketing },
  ];
}
