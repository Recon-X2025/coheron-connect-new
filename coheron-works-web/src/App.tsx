import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TenantConfigProvider, useTenantConfig } from './contexts/TenantConfigContext';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';
import { getEnabledRoutes, AppRoute } from './shared/moduleRegistry';

// Shared pages (not module-specific)
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Subscription = lazy(() => import('./pages/Subscription').then(m => ({ default: m.Subscription })));
const Settings = lazy(() => import('./modules/admin/pages/Settings').then(m => ({ default: m.Settings })));

function ModuleRoutes() {
  const { enabledModules } = useTenantConfig();
  const [moduleRoutes, setModuleRoutes] = useState<AppRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEnabledRoutes(enabledModules).then((routes) => {
      if (!cancelled) {
        setModuleRoutes(routes);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [enabledModules]);

  if (loading) {
    return <LoadingSpinner size="large" message="Loading modules..." />;
  }

  return (
    <>
      {moduleRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<Layout>{route.element}</Layout>}
        />
      ))}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <TenantConfigProvider>
        <Suspense fallback={<LoadingSpinner size="large" message="Loading..." />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Layout><Pricing /></Layout>} />

          {/* App routes */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />

          {/* Dynamic module routes */}
          <ModuleRoutes />
        </Routes>
        </Suspense>
        </TenantConfigProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
