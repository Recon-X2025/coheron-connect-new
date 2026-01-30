import { lazy } from 'react';
const CRMDashboard = lazy(() => import('./CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const CRMPipeline = lazy(() => import('./CRMPipeline').then(m => ({ default: m.CRMPipeline })));
const LeadsList = lazy(() => import('./LeadsList').then(m => ({ default: m.LeadsList })));
const Opportunities = lazy(() => import('./Opportunities').then(m => ({ default: m.Opportunities })));
const Customers = lazy(() => import('./Customers').then(m => ({ default: m.Customers })));
const TasksCalendar = lazy(() => import('./TasksCalendar').then(m => ({ default: m.TasksCalendar })));
const AutomationEngine = lazy(() => import('./AutomationEngine').then(m => ({ default: m.AutomationEngine })));

export const crmRoutes = [
  { path: '/crm/dashboard', element: <CRMDashboard /> },
  { path: '/crm/pipeline', element: <CRMPipeline /> },
  { path: '/crm/leads', element: <LeadsList /> },
  { path: '/crm/opportunities', element: <Opportunities /> },
  { path: '/crm/customers', element: <Customers /> },
  { path: '/crm/tasks', element: <TasksCalendar /> },
  { path: '/crm/automation', element: <AutomationEngine /> },
];
