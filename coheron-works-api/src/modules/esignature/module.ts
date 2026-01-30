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
  name: 'esignature',
  description: 'Electronic signature documents, templates, signers',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/esignature', router: routes.esignature, middleware: [requireModule('esignature')], },
  ];
}
