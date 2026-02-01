import { lazy } from 'react';
const Inventory = lazy(() => import('./Inventory').then(m => ({ default: m.Inventory })));
const InventoryDashboard = lazy(() => import('./InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const Products = lazy(() => import('./Products').then(m => ({ default: m.Products })));
const Warehouses = lazy(() => import('./Warehouses').then(m => ({ default: m.Warehouses })));
const StockMovements = lazy(() => import('./StockMovements').then(m => ({ default: m.StockMovements })));
const BatchSerialManagement = lazy(() => import('./BatchSerialManagement').then(m => ({ default: m.BatchSerialManagement })));
const WarehouseOperations = lazy(() => import('./WarehouseOperations').then(m => ({ default: m.WarehouseOperations })));
const StockReports = lazy(() => import('./StockReports').then(m => ({ default: m.StockReports })));
const InventorySettings = lazy(() => import('./InventorySettings').then(m => ({ default: m.InventorySettings })));
const PurchaseOrders = lazy(() => import('./PurchaseOrders').then(m => ({ default: m.PurchaseOrders })));

export const inventoryRoutes = [
  { path: '/inventory', element: <Inventory /> },
  { path: '/inventory/dashboard', element: <InventoryDashboard /> },
  { path: '/inventory/products', element: <Products /> },
  { path: '/inventory/warehouses', element: <Warehouses /> },
  { path: '/inventory/movements', element: <StockMovements /> },
  { path: '/inventory/batch-serial', element: <BatchSerialManagement /> },
  { path: '/inventory/warehouse-ops', element: <WarehouseOperations /> },
  { path: '/inventory/reports', element: <StockReports /> },
  { path: '/inventory/settings', element: <InventorySettings /> },
  { path: '/inventory/purchase-orders', element: <PurchaseOrders /> },
];
