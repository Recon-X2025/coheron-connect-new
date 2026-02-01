import { lazy } from 'react';
const AdminPortal = lazy(() => import('./pages/AdminPortal'));
const RolesManagement = lazy(() => import('./RolesManagement').then(m => ({ default: m.RolesManagement })));
const PermissionsManagement = lazy(() => import('./PermissionsManagement').then(m => ({ default: m.PermissionsManagement })));
const UserRoleAssignments = lazy(() => import('./UserRoleAssignments').then(m => ({ default: m.UserRoleAssignments })));
const AuditLogsViewer = lazy(() => import('./AuditLogsViewer').then(m => ({ default: m.AuditLogsViewer })));
const DataImport = lazy(() => import('./DataImport').then(m => ({ default: m.DataImport })));

export const adminRoutes = [
  { path: '/admin', element: <AdminPortal /> },
  { path: '/admin/roles', element: <RolesManagement onRoleSelect={() => {}} /> },
  { path: '/admin/permissions', element: <PermissionsManagement /> },
  { path: '/admin/users', element: <UserRoleAssignments /> },
  { path: '/admin/audit', element: <AuditLogsViewer /> },
  { path: '/admin/import', element: <DataImport /> },
];
