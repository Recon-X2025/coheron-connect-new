import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'ai',
  description: 'AI copilot, chatbot, and configuration',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/ai/copilot', router: routes.copilot },
    { path: '/ai/chatbot', router: routes.chatbot },
    { path: '/ai/config', router: routes.config },
    { path: '/ai', router: routes.aiEndpoints },
  ];
}
