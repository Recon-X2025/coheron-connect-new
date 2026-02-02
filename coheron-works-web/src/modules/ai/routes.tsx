import { lazy } from 'react';
const AIDashboard = lazy(() => import('./pages/AIDashboard'));
const AIChat = lazy(() => import('./pages/AIChat'));
const DocumentAnalysis = lazy(() => import('./pages/DocumentAnalysis'));
const AIInsights = lazy(() => import('./pages/AIInsights'));

export const aiRoutes = [
  { path: '/ai', element: <AIDashboard /> },
  { path: '/ai/chat', element: <AIChat /> },
  { path: '/ai/documents', element: <DocumentAnalysis /> },
  { path: '/ai/insights', element: <AIInsights /> },
];
