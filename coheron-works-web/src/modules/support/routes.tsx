import { lazy } from 'react';
const SupportDashboard = lazy(() => import('./pages/SupportDashboard').then(m => ({ default: m.SupportDashboard })));
const SupportTickets = lazy(() => import('./pages/SupportTickets'));
const AgentWorkbench = lazy(() => import('./pages/AgentWorkbench').then(m => ({ default: m.AgentWorkbench })));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase').then(m => ({ default: m.KnowledgeBase })));
const SupportReports = lazy(() => import('./pages/SupportReports').then(m => ({ default: m.SupportReports })));
const SurveyManagement = lazy(() => import('./pages/SurveyManagement').then(m => ({ default: m.SurveyManagement })));
const ITSM = lazy(() => import('./pages/ITSM'));
const AutomationBuilder = lazy(() => import('./pages/AutomationBuilder'));
const CustomerPortal = lazy(() => import('./CustomerPortal').then(m => ({ default: m.CustomerPortal })));
const CommunityForums = lazy(() => import('./pages/CommunityForums'));
const CMDB = lazy(() => import('./pages/CMDB'));
const SLAPrediction = lazy(() => import('./pages/SLAPrediction'));
const TriggerEngine = lazy(() => import('./pages/TriggerEngine'));
const ViewsBuilder = lazy(() => import('./pages/ViewsBuilder'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));

export const supportRoutes = [
  { path: '/support/dashboard', element: <SupportDashboard /> },
  { path: '/support/tickets', element: <SupportTickets /> },
  { path: '/support/workbench', element: <AgentWorkbench /> },
  { path: '/support/knowledge-base', element: <KnowledgeBase /> },
  { path: '/support/reports', element: <SupportReports /> },
  { path: '/support/surveys', element: <SurveyManagement /> },
  { path: '/support/itsm', element: <ITSM /> },
  { path: '/support/automation', element: <AutomationBuilder /> },
  { path: '/portal', element: <CustomerPortal /> },
  { path: '/support/forums', element: <CommunityForums /> },
  { path: '/support/cmdb', element: <CMDB /> },
  { path: '/support/sla-prediction', element: <SLAPrediction /> },
  { path: '/support/triggers', element: <TriggerEngine /> },
  { path: '/support/views', element: <ViewsBuilder /> },
  { path: '/support/agent-dashboard', element: <AgentDashboard /> },
];
