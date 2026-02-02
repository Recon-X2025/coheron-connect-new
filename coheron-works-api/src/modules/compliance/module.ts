import { Router } from 'express';
import gstFiling from './routes/gstFiling.js';
import einvoice from './routes/einvoice.js';
import ewayBill from './routes/ewayBill.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'compliance',
  description: 'GST filing, e-invoicing, e-way bills, TDS, PF/ESI compliance for India',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/compliance/gst', router: gstFiling },
    { path: '/compliance/einvoice', router: einvoice },
    { path: '/compliance/eway-bill', router: ewayBill },
  ];
}
