import { lazy } from 'react';
const MarketingDashboard = lazy(() => import('./MarketingDashboard').then(m => ({ default: m.MarketingDashboard })));
const Campaigns = lazy(() => import('./Campaigns').then(m => ({ default: m.Campaigns })));
const Attribution = lazy(() => import('./pages/Attribution').then(m => ({ default: m.Attribution })));
const SEOTools = lazy(() => import('./pages/SEOTools').then(m => ({ default: m.SEOTools })));

export const marketingRoutes = [
  { path: '/marketing/dashboard', element: <MarketingDashboard /> },
  { path: '/marketing/campaigns', element: <Campaigns /> },
  { path: '/marketing/attribution', element: <Attribution /> },
  { path: '/marketing/seo', element: <SEOTools /> },
];
