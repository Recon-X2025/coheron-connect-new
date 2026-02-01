import { lazy } from 'react';
const HRDashboard = lazy(() => import('./HRDashboard').then(m => ({ default: m.HRDashboard })));
const HRModules = lazy(() => import('./HRModules').then(m => ({ default: m.HRModules })));
const Employees = lazy(() => import('./Employees').then(m => ({ default: m.Employees })));
const Payroll = lazy(() => import('./Payroll').then(m => ({ default: m.Payroll })));
const Recruitment = lazy(() => import('./Recruitment').then(m => ({ default: m.Recruitment })));
const Policies = lazy(() => import('./Policies').then(m => ({ default: m.Policies })));
const Appraisals = lazy(() => import('./Appraisals').then(m => ({ default: m.Appraisals })));
const LMS = lazy(() => import('./LMS').then(m => ({ default: m.LMS })));
const Attendance = lazy(() => import('./Attendance').then(m => ({ default: m.Attendance })));
const LeaveManagement = lazy(() => import('./LeaveManagement').then(m => ({ default: m.LeaveManagement })));
const Onboarding = lazy(() => import('./Onboarding').then(m => ({ default: m.Onboarding })));
const Offboarding = lazy(() => import('./Offboarding').then(m => ({ default: m.Offboarding })));
const CompensationPlanning = lazy(() => import('./pages/CompensationPlanning').then(m => ({ default: m.CompensationPlanning })));
const SuccessionPlanning = lazy(() => import('./pages/SuccessionPlanning').then(m => ({ default: m.SuccessionPlanning })));
const BenefitsAdmin = lazy(() => import('./pages/BenefitsAdmin').then(m => ({ default: m.BenefitsAdmin })));
const ATS = lazy(() => import('./pages/ATS').then(m => ({ default: m.ATS })));
const LMSHub = lazy(() => import('./pages/LMSHub').then(m => ({ default: m.LMSHub })));

export const hrRoutes = [
  { path: '/hr', element: <HRDashboard /> },
  { path: '/hr/modules', element: <HRModules /> },
  { path: '/hr/employees', element: <Employees /> },
  { path: '/hr/payroll', element: <Payroll /> },
  { path: '/hr/recruitment', element: <Recruitment /> },
  { path: '/hr/policies', element: <Policies /> },
  { path: '/hr/appraisals', element: <Appraisals /> },
  { path: '/hr/lms', element: <LMS /> },
  { path: '/hr/attendance', element: <Attendance /> },
  { path: '/hr/leave', element: <LeaveManagement /> },
  { path: '/hr/onboarding', element: <Onboarding /> },
  { path: '/hr/offboarding', element: <Offboarding /> },
  { path: '/hr/compensation', element: <CompensationPlanning /> },
  { path: '/hr/succession', element: <SuccessionPlanning /> },
  { path: '/hr/benefits', element: <BenefitsAdmin /> },
  { path: '/hr/ats', element: <ATS /> },
  { path: '/hr/lms-hub', element: <LMSHub /> },
];
