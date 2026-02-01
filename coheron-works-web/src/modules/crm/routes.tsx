import { lazy } from 'react';
const CRMDashboard = lazy(() => import('./CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const CRMPipeline = lazy(() => import('./CRMPipeline').then(m => ({ default: m.CRMPipeline })));
const LeadsList = lazy(() => import('./LeadsList').then(m => ({ default: m.LeadsList })));
const Opportunities = lazy(() => import('./Opportunities').then(m => ({ default: m.Opportunities })));
const Customers = lazy(() => import('./Customers').then(m => ({ default: m.Customers })));
const TasksCalendar = lazy(() => import('./TasksCalendar').then(m => ({ default: m.TasksCalendar })));
const AutomationEngine = lazy(() => import('./AutomationEngine').then(m => ({ default: m.AutomationEngine })));
const AILeadScoring = lazy(() => import('./pages/AILeadScoring').then(m => ({ default: m.AILeadScoring })));
const TerritoryManagement = lazy(() => import('./pages/TerritoryManagement').then(m => ({ default: m.TerritoryManagement })));
const CPQ = lazy(() => import('./pages/CPQ').then(m => ({ default: m.CPQ })));
const CRMForecasting = lazy(() => import('./pages/CRMForecasting').then(m => ({ default: m.CRMForecasting })));
const AutomationFlows = lazy(() => import('./pages/AutomationFlows').then(m => ({ default: m.AutomationFlows })));
const NurtureSequences = lazy(() => import('./pages/NurtureSequences').then(m => ({ default: m.NurtureSequences })));
const AssignmentRules = lazy(() => import('./pages/AssignmentRules').then(m => ({ default: m.AssignmentRules })));

export const crmRoutes = [
  { path: '/crm/dashboard', element: <CRMDashboard /> },
  { path: '/crm/pipeline', element: <CRMPipeline /> },
  { path: '/crm/leads', element: <LeadsList /> },
  { path: '/crm/opportunities', element: <Opportunities /> },
  { path: '/crm/customers', element: <Customers /> },
  { path: '/crm/tasks', element: <TasksCalendar /> },
  { path: '/crm/automation', element: <AutomationEngine /> },
  { path: '/crm/ai-scoring', element: <AILeadScoring /> },
  { path: '/crm/territories', element: <TerritoryManagement /> },
  { path: '/crm/cpq', element: <CPQ /> },
  { path: '/crm/forecasting', element: <CRMForecasting /> },
  { path: '/crm/automation-flows', element: <AutomationFlows /> },
  { path: '/crm/nurture-sequences', element: <NurtureSequences /> },
  { path: '/crm/assignment-rules', element: <AssignmentRules /> },
];
