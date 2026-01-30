import {
  saleOrdersRoutes,
  invoicesRoutes,
  salesPricingRoutes,
  salesContractsRoutes,
  salesDeliveryRoutes,
  salesReturnsRoutes,
  salesForecastingRoutes,
  salesTeamRoutes,
  salesAnalyticsRoutes,
} from './routes/index.js';

export const metadata = {
  name: 'sales',
  description: 'Sales module: orders, invoices, pricing, contracts, delivery, returns, forecasting, team, analytics',
  version: '1.0.0',
};

export function register() {
  return [
    { path: '/sale-orders', router: saleOrdersRoutes },
    { path: '/invoices', router: invoicesRoutes },
    { path: '/sales/pricing', router: salesPricingRoutes },
    { path: '/sales/contracts', router: salesContractsRoutes },
    { path: '/sales/delivery', router: salesDeliveryRoutes },
    { path: '/sales/returns', router: salesReturnsRoutes },
    { path: '/sales/forecasting', router: salesForecastingRoutes },
    { path: '/sales/team', router: salesTeamRoutes },
    { path: '/sales/analytics', router: salesAnalyticsRoutes },
  ];
}
