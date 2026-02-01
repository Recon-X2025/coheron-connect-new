import { lazy } from 'react';
const MarketingDashboard = lazy(() => import('./MarketingDashboard').then(m => ({ default: m.MarketingDashboard })));
const Campaigns = lazy(() => import('./Campaigns').then(m => ({ default: m.Campaigns })));
const Attribution = lazy(() => import('./pages/Attribution').then(m => ({ default: m.Attribution })));
const SEOTools = lazy(() => import('./pages/SEOTools').then(m => ({ default: m.SEOTools })));
const JourneyBuilder = lazy(() => import('./pages/JourneyBuilder').then(m => ({ default: m.JourneyBuilder })));
const EmailDesigner = lazy(() => import('./pages/EmailDesigner').then(m => ({ default: m.EmailDesigner })));
const SocialScheduler = lazy(() => import('./pages/SocialScheduler').then(m => ({ default: m.SocialScheduler })));
const MarketingWorkflows = lazy(() => import('./pages/MarketingWorkflows').then(m => ({ default: m.MarketingWorkflows })));

export const marketingRoutes = [
  { path: '/marketing/dashboard', element: <MarketingDashboard /> },
  { path: '/marketing/campaigns', element: <Campaigns /> },
  { path: '/marketing/attribution', element: <Attribution /> },
  { path: '/marketing/seo', element: <SEOTools /> },
  { path: '/marketing/journey-builder', element: <JourneyBuilder /> },
  { path: '/marketing/email-designer', element: <EmailDesigner /> },
  { path: '/marketing/social-scheduler', element: <SocialScheduler /> },
  { path: '/marketing/workflows', element: <MarketingWorkflows /> },
];
