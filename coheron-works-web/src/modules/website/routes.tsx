import { lazy } from 'react';
const WebsiteDashboard = lazy(() => import('./WebsiteDashboard').then(m => ({ default: m.WebsiteDashboard })));
const Website = lazy(() => import('./Website'));
const WebsiteAnalytics = lazy(() => import('./components/WebsiteAnalytics').then(m => ({ default: m.WebsiteAnalytics })));
const PageBuilder = lazy(() => import('./components/PageBuilder').then(m => ({ default: m.PageBuilder })));
const ProductCatalog = lazy(() => import('./components/ProductCatalog').then(m => ({ default: m.ProductCatalog })));
const SiteSettings = lazy(() => import('./components/SiteSettings').then(m => ({ default: m.SiteSettings })));
const Promotions = lazy(() => import('./components/Promotions').then(m => ({ default: m.Promotions })));
const MediaLibrary = lazy(() => import('./components/MediaLibrary').then(m => ({ default: m.MediaLibrary })));
const CartCheckout = lazy(() => import('./components/CartCheckout').then(m => ({ default: m.CartCheckout })));

export const websiteRoutes = [
  { path: '/website/dashboard', element: <WebsiteDashboard /> },
  { path: '/website', element: <Website /> },
  { path: '/website/analytics', element: <WebsiteAnalytics /> },
  { path: '/website/builder', element: <PageBuilder /> },
  { path: '/website/catalog', element: <ProductCatalog /> },
  { path: '/website/settings', element: <SiteSettings /> },
  { path: '/website/promotions', element: <Promotions /> },
  { path: '/website/media', element: <MediaLibrary /> },
  { path: '/website/checkout', element: <CartCheckout /> },
];
