import { lazy } from 'react';
const POSDashboard = lazy(() => import('./POSDashboard').then(m => ({ default: m.POSDashboard })));
const POSInterface = lazy(() => import('./POSInterface'));
const POSSessions = lazy(() => import('./POSSessions').then(m => ({ default: m.POSSessions })));
const POSTerminals = lazy(() => import('./POSTerminals').then(m => ({ default: m.POSTerminals })));

export const posRoutes = [
  { path: '/pos/dashboard', element: <POSDashboard /> },
  { path: '/pos', element: <POSInterface /> },
  { path: '/pos/sessions', element: <POSSessions /> },
  { path: '/pos/terminals', element: <POSTerminals /> },
];
