import { lazy } from 'react';
const MarketingDashboard = lazy(() => import('./MarketingDashboard').then(m => ({ default: m.MarketingDashboard })));
const Campaigns = lazy(() => import('./Campaigns').then(m => ({ default: m.Campaigns })));

export const marketingRoutes = [
  { path: '/marketing/dashboard', element: <MarketingDashboard /> },
  { path: '/marketing/campaigns', element: <Campaigns /> },
];
