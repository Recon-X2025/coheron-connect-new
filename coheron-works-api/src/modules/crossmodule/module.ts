import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'crossmodule',
  description: 'Cross-module shared services: payments, file storage, email/WhatsApp webhooks',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/payments', router: routes.payments },
    { path: '/files', router: routes.files },
    { path: '/email-webhook', router: routes.emailWebhook, public: true },
    { path: '/whatsapp', router: routes.whatsappWebhook, public: true },
  ];
}
