import { lazy } from 'react';
const ProjectsDashboard = lazy(() => import('./pages/ProjectsDashboard').then(m => ({ default: m.ProjectsDashboard })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const OKRs = lazy(() => import('./pages/OKRs').then(m => ({ default: m.OKRs })));
const AutomationRules = lazy(() => import('./pages/AutomationRules').then(m => ({ default: m.AutomationRules })));

export const projectsRoutes = [
  { path: '/projects/dashboard', element: <ProjectsDashboard /> },
  { path: '/projects', element: <Projects /> },
  { path: '/projects/:id', element: <ProjectDetail /> },
  { path: '/projects/okrs', element: <OKRs /> },
  { path: '/projects/automation-rules', element: <AutomationRules /> },
];
