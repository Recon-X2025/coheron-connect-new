import { lazy } from 'react';
const Marketplace = lazy(() => import('./pages/Marketplace'));

export const platformRoutes = [
  { path: '/platform/marketplace', element: <Marketplace /> },
];
