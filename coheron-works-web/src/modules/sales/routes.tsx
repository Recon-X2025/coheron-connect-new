import { lazy } from 'react';
const SalesDashboard = lazy(() => import('./SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const SalesOrders = lazy(() => import('./SalesOrders').then(m => ({ default: m.SalesOrders })));
const Quotations = lazy(() => import('./Quotations').then(m => ({ default: m.Quotations })));
const PricingManagement = lazy(() => import('./PricingManagement').then(m => ({ default: m.PricingManagement })));
const ContractsManagement = lazy(() => import('./ContractsManagement').then(m => ({ default: m.ContractsManagement })));
const DeliveryTracking = lazy(() => import('./DeliveryTracking').then(m => ({ default: m.DeliveryTracking })));
const ReturnsManagement = lazy(() => import('./ReturnsManagement').then(m => ({ default: m.ReturnsManagement })));
const SalesForecasting = lazy(() => import('./SalesForecasting').then(m => ({ default: m.SalesForecasting })));
const SalesTeamPerformance = lazy(() => import('./SalesTeamPerformance').then(m => ({ default: m.SalesTeamPerformance })));
const CreditLimits = lazy(() => import('./pages/CreditLimits').then(m => ({ default: m.CreditLimits })));
const BlanketOrders = lazy(() => import('./pages/BlanketOrders').then(m => ({ default: m.BlanketOrders })));
const PricingEngine = lazy(() => import('./pages/PricingEngine').then(m => ({ default: m.PricingEngine })));
const ATPDashboard = lazy(() => import('./pages/ATPDashboard').then(m => ({ default: m.ATPDashboard })));
const SalesAgreements = lazy(() => import('./pages/SalesAgreements').then(m => ({ default: m.SalesAgreements })));

export const salesRoutes = [
  { path: '/sales/dashboard', element: <SalesDashboard /> },
  { path: '/sales/orders', element: <SalesOrders /> },
  { path: '/sales/quotations', element: <Quotations /> },
  { path: '/sales/pricing', element: <PricingManagement /> },
  { path: '/sales/contracts', element: <ContractsManagement /> },
  { path: '/sales/delivery', element: <DeliveryTracking /> },
  { path: '/sales/returns', element: <ReturnsManagement /> },
  { path: '/sales/forecasting', element: <SalesForecasting /> },
  { path: '/sales/team', element: <SalesTeamPerformance /> },
  { path: '/sales/credit-limits', element: <CreditLimits /> },
  { path: '/sales/blanket-orders', element: <BlanketOrders /> },
  { path: '/sales/pricing-engine', element: <PricingEngine /> },
  { path: '/sales/atp', element: <ATPDashboard /> },
  { path: '/sales/agreements', element: <SalesAgreements /> },
];
