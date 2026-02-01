import { RouteObject } from 'react-router-dom';

interface ModuleDefinition {
  name: string;
  loadRoutes: () => Promise<{ [key: string]: any }>;
}

const modules: ModuleDefinition[] = [
  { name: 'crm', loadRoutes: () => import('../modules/crm/routes') },
  { name: 'sales', loadRoutes: () => import('../modules/sales/routes') },
  { name: 'inventory', loadRoutes: () => import('../modules/inventory/routes') },
  { name: 'accounting', loadRoutes: () => import('../modules/accounting/routes') },
  { name: 'hr', loadRoutes: () => import('../modules/hr/routes') },
  { name: 'manufacturing', loadRoutes: () => import('../modules/manufacturing/routes') },
  { name: 'marketing', loadRoutes: () => import('../modules/marketing/routes') },
  { name: 'pos', loadRoutes: () => import('../modules/pos/routes') },
  { name: 'support', loadRoutes: () => import('../modules/support/routes') },
  { name: 'projects', loadRoutes: () => import('../modules/projects/routes') },
  { name: 'website', loadRoutes: () => import('../modules/website/routes') },
  { name: 'admin', loadRoutes: () => import('../modules/admin/routes') },
  { name: 'esignature', loadRoutes: () => import('../modules/esignature/routes') },
  { name: 'compliance', loadRoutes: () => import('../modules/compliance/routes') },
  { name: 'platform', loadRoutes: () => import('../modules/platform/routes') },
];

export interface AppRoute {
  path: string;
  element: React.ReactNode;
}

export async function getEnabledRoutes(enabledModules: string[]): Promise<AppRoute[]> {
  const allRoutes: AppRoute[] = [];

  const loadPromises = modules
    .filter(m => enabledModules.includes(m.name))
    .map(async (m) => {
      try {
        const mod = await m.loadRoutes();
        // Each module exports a named array like crmRoutes, salesRoutes, etc.
        const routeKey = Object.keys(mod).find(k => k.endsWith('Routes'));
        if (routeKey && Array.isArray(mod[routeKey])) {
          return mod[routeKey] as AppRoute[];
        }
        return [];
      } catch (err) {
        console.warn(`Failed to load routes for module: ${m.name}`, err);
        return [];
      }
    });

  const results = await Promise.all(loadPromises);
  for (const routes of results) {
    allRoutes.push(...routes);
  }

  return allRoutes;
}

export function getAllModuleNames(): string[] {
  return modules.map(m => m.name);
}
