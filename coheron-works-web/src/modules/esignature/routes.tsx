import { lazy } from 'react';
const ESignature = lazy(() => import('./ESignature').then(m => ({ default: m.ESignature })));

export const esignatureRoutes = [
  { path: '/esignature', element: <ESignature /> },
];
