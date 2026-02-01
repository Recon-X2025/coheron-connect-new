import { lazy } from 'react';
const Marketplace = lazy(() => import('./pages/Marketplace'));
const VisualWorkflowBuilder = lazy(() => import('./pages/VisualWorkflowBuilder'));
const APIBuilder = lazy(() => import('./pages/APIBuilder'));
const WebhookManager = lazy(() => import('./pages/WebhookManager'));
const DeveloperPortal = lazy(() => import('./pages/DeveloperPortal'));

export const platformRoutes = [
  { path: '/platform/marketplace', element: <Marketplace /> },
  { path: '/platform/visual-workflows', element: <VisualWorkflowBuilder /> },
  { path: '/platform/api-builder', element: <APIBuilder /> },
  { path: '/platform/webhooks', element: <WebhookManager /> },
  { path: '/platform/developer', element: <DeveloperPortal /> },
];
