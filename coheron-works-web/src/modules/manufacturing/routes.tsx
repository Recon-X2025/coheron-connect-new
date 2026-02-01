import { lazy } from 'react';
const ManufacturingDashboard = lazy(() => import('./ManufacturingDashboard').then(m => ({ default: m.ManufacturingDashboard })));
const ManufacturingOrders = lazy(() => import('./ManufacturingOrders').then(m => ({ default: m.ManufacturingOrders })));
const BOMManagement = lazy(() => import('./BOMManagement'));
const RoutingManagement = lazy(() => import('./RoutingManagement'));
const WorkOrders = lazy(() => import('./WorkOrders'));
const QualityControl = lazy(() => import('./QualityControl'));
const CostingAnalytics = lazy(() => import('./CostingAnalytics'));
const ProcessManufacturing = lazy(() => import('./pages/ProcessManufacturing'));
const ByProducts = lazy(() => import('./pages/ByProducts'));
const KanbanProduction = lazy(() => import('./pages/KanbanProduction'));
const AdvancedQuality = lazy(() => import('./pages/AdvancedQuality'));
const CostRollupPage = lazy(() => import('./pages/CostRollup'));
const FMEAWorksheet = lazy(() => import('./pages/FMEAWorksheet'));

export const manufacturingRoutes = [
  { path: '/manufacturing/dashboard', element: <ManufacturingDashboard /> },
  { path: '/manufacturing/orders', element: <ManufacturingOrders /> },
  { path: '/manufacturing/bom', element: <BOMManagement /> },
  { path: '/manufacturing/routing', element: <RoutingManagement /> },
  { path: '/manufacturing/work-orders', element: <WorkOrders /> },
  { path: '/manufacturing/quality', element: <QualityControl /> },
  { path: '/manufacturing/costing', element: <CostingAnalytics /> },
  { path: '/manufacturing/process', element: <ProcessManufacturing /> },
  { path: '/manufacturing/byproducts', element: <ByProducts /> },
  { path: '/manufacturing/kanban', element: <KanbanProduction /> },
  { path: '/manufacturing/advanced-quality', element: <AdvancedQuality /> },
  { path: '/manufacturing/cost-rollup', element: <CostRollupPage /> },
  { path: '/manufacturing/fmea', element: <FMEAWorksheet /> },
];
