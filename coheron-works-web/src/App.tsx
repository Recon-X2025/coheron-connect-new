import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';

// Module route manifests
import { crmRoutes } from './modules/crm/routes';
import { salesRoutes } from './modules/sales/routes';
import { inventoryRoutes } from './modules/inventory/routes';
import { accountingRoutes } from './modules/accounting/routes';
import { hrRoutes } from './modules/hr/routes';
import { manufacturingRoutes } from './modules/manufacturing/routes';
import { marketingRoutes } from './modules/marketing/routes';
import { posRoutes } from './modules/pos/routes';
import { supportRoutes } from './modules/support/routes';
import { projectsRoutes } from './modules/projects/routes';
import { websiteRoutes } from './modules/website/routes';
import { adminRoutes } from './modules/admin/routes';
import { esignatureRoutes } from './modules/esignature/routes';
import { complianceRoutes } from './modules/compliance/routes';

// Shared pages (not module-specific)
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Subscription = lazy(() => import('./pages/Subscription').then(m => ({ default: m.Subscription })));
const Settings = lazy(() => import('./modules/admin/pages/Settings').then(m => ({ default: m.Settings })));

// Combine all module routes
const moduleRoutes = [
  ...crmRoutes,
  ...salesRoutes,
  ...inventoryRoutes,
  ...accountingRoutes,
  ...hrRoutes,
  ...manufacturingRoutes,
  ...marketingRoutes,
  ...posRoutes,
  ...supportRoutes,
  ...projectsRoutes,
  ...websiteRoutes,
  ...adminRoutes,
  ...esignatureRoutes,
  ...complianceRoutes,
];

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner size="large" message="Loading..." />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Layout><Pricing /></Layout>} />

          {/* App routes */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />

          {/* Module routes */}
          {moduleRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<Layout>{route.element}</Layout>}
            />
          ))}
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
