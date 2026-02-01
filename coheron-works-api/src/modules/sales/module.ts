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
  quotationsRoutes,
  subscriptionRoutes,
  dropshipRoutes,
  commissionsRoutes,
  ecommerceConnectorRoutes,
  creditLimitsRoutes,
  blanketOrdersRoutes,
  pricingEngineRoutes,
  atpRoutes,
  salesAgreementsRoutes,
} from './routes/index.js';

export const metadata = {
  name: 'sales',
  description: 'Sales module: orders, invoices, pricing, contracts, delivery, returns, forecasting, team, analytics, quotations, subscriptions, dropship, commissions',
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
    { path: '/quotations', router: quotationsRoutes },
    { path: '/sales/subscriptions', router: subscriptionRoutes },
    { path: '/sales/dropship', router: dropshipRoutes },
    { path: '/sales/commissions', router: commissionsRoutes },
    { path: '/sales/ecommerce', router: ecommerceConnectorRoutes },
    { path: '/sales/credit-limits', router: creditLimitsRoutes },
    { path: '/sales/blanket-orders', router: blanketOrdersRoutes },
    { path: '/sales/pricing-engine', router: pricingEngineRoutes },
    { path: '/sales/atp', router: atpRoutes },
    { path: '/sales/agreements', router: salesAgreementsRoutes },
  ];
}
