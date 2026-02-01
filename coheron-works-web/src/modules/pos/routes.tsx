import { lazy } from 'react';
const POSDashboard = lazy(() => import('./POSDashboard').then(m => ({ default: m.POSDashboard })));
const POSInterface = lazy(() => import('./POSInterface'));
const POSSessions = lazy(() => import('./POSSessions').then(m => ({ default: m.POSSessions })));
const POSTerminals = lazy(() => import('./POSTerminals').then(m => ({ default: m.POSTerminals })));
const LoyaltyProgram = lazy(() => import('./pages/LoyaltyProgram').then(m => ({ default: m.LoyaltyProgram })));
const KitchenDisplay = lazy(() => import('./pages/KitchenDisplay').then(m => ({ default: m.KitchenDisplay })));
const MultiStore = lazy(() => import('./pages/MultiStore').then(m => ({ default: m.MultiStore })));

export const posRoutes = [
  { path: '/pos/dashboard', element: <POSDashboard /> },
  { path: '/pos', element: <POSInterface /> },
  { path: '/pos/sessions', element: <POSSessions /> },
  { path: '/pos/terminals', element: <POSTerminals /> },
  { path: '/pos/loyalty', element: <LoyaltyProgram /> },
  { path: '/pos/kitchen', element: <KitchenDisplay /> },
  { path: '/pos/stores', element: <MultiStore /> },
];
