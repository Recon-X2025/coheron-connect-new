import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'inventory',
  description: 'Inventory management, products, stock, warehousing, shipping, barcode, serial/batch tracking',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/inventory', router: routes.inventory },
    { path: '/products', router: routes.products },
    { path: '/inventory/reservations', router: routes.stockReservations },
    { path: '/partners', router: routes.partners },
    { path: '/purchase-orders', router: routes.purchaseOrders },
    { path: '/inventory/reorder', router: routes.reorder },
    { path: '/inventory/serial-numbers', router: routes.serialNumbers },
    { path: '/inventory/batches', router: routes.batches },
    { path: '/inventory/warehouse-zones', router: routes.warehouseZones },
    { path: '/inventory/barcode', router: routes.barcode },
    { path: '/inventory/shipping', router: routes.shipping },
    { path: '/inventory/landed-costs', router: routes.landedCost },
    { path: '/inventory/cycle-counting', router: routes.cycleCounting },
    { path: '/inventory/rfid', router: routes.rfid },
    { path: '/inventory/putaway', router: routes.putaway },
    { path: '/inventory/wave-picking', router: routes.wavePicking },
    { path: '/inventory/cross-docking', router: routes.crossDocking },
    { path: '/inventory/consignment', router: routes.consignment },
    { path: '/inventory/packaging', router: routes.packaging },
    { path: '/inventory/demand-planning', router: routes.demandPlanning },
    { path: '/inventory/intercompany', router: routes.intercompany },
    { path: '/inventory/hazmat', router: routes.hazmat },
  ];
}
