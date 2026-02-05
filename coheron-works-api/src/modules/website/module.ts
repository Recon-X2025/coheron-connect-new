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
  name: 'website',
  description: 'Website builder, e-commerce, media, promotions',
  dependencies: ['inventory', 'sales'],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/website/products', router: routes.websiteProducts, middleware: [requireModule('website')], },
    { path: '/website/orders', router: routes.websiteOrders, middleware: [requireModule('website')], },
    { path: '/website/cart', router: routes.websiteCart, middleware: [requireModule('website')], },
    { path: '/website/media', router: routes.websiteMedia, middleware: [requireModule('website')], },
    { path: '/website/promotions', router: routes.websitePromotions, middleware: [requireModule('website')], },
    { path: '/website/sites', router: routes.websiteSites, middleware: [requireModule('website')], },
    { path: '/website', router: routes.website, middleware: [requireModule('website')], },
  ];
}
