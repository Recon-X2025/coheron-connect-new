import { lazy } from 'react';

const SecurityDashboard = lazy(() => import('./pages/SecurityDashboard'));
const GDPRManagement = lazy(() => import('./pages/GDPRManagement'));
const AuditLogViewer = lazy(() => import('./pages/AuditLogViewer'));
const AccessReview = lazy(() => import('./pages/AccessReview'));
const ComplianceReports = lazy(() => import('./pages/ComplianceReports'));

export const complianceRoutes = [
  { path: '/compliance/security', element: <SecurityDashboard /> },
  { path: '/compliance/gdpr', element: <GDPRManagement /> },
  { path: '/compliance/audit', element: <AuditLogViewer /> },
  { path: '/compliance/access-review', element: <AccessReview /> },
  { path: '/compliance/reports', element: <ComplianceReports /> },
];
