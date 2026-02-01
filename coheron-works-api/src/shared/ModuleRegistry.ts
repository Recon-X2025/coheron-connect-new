import { Router } from 'express';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireModule } from './middleware/moduleGuard.js';
import logger from './utils/logger.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export interface ModuleMetadata {
  name: string;
  description: string;
  dependencies?: string[];
  version?: string;
}

interface LoadedModule {
  metadata: ModuleMetadata;
  routes: ModuleRoute[];
}

const ALWAYS_ON_MODULES = ['admin', 'crossmodule', 'platform'];

export class ModuleRegistry {
  private modules = new Map<string, LoadedModule>();
  private modulesDir: string;

  constructor() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    this.modulesDir = path.join(__dirname, '..', 'modules');
  }

  async discoverAndLoad(): Promise<void> {
    const entries = readdirSync(this.modulesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const modulePath = path.join(this.modulesDir, entry.name, 'module.js');
      try {
        const mod = await import(modulePath);
        if (!mod.metadata || !mod.register) {
          logger.warn(`Module ${entry.name} missing metadata or register(), skipping`);
          continue;
        }
        const routes = mod.register();
        this.modules.set(mod.metadata.name, {
          metadata: mod.metadata,
          routes,
        });
        logger.info(`Loaded module: ${mod.metadata.name} (${routes.length} routes)`);
      } catch (err: any) {
        if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
          logger.debug(`No module.ts for ${entry.name}, skipping`);
        } else {
          logger.error({ err }, `Failed to load module ${entry.name}`);
        }
      }
    }
  }

  mountAll(router: Router): void {
    const sorted = this.topologicalSort();

    for (const moduleName of sorted) {
      const loaded = this.modules.get(moduleName)!;
      const isAlwaysOn = ALWAYS_ON_MODULES.includes(moduleName);

      for (const route of loaded.routes) {
        const middlewares: any[] = [];

        // If the route itself has middleware defined, use those
        if (route.middleware && route.middleware.length > 0) {
          middlewares.push(...route.middleware);
        } else if (!isAlwaysOn && !route.public) {
          // Auto-apply requireModule guard for non-always-on modules
          middlewares.push(requireModule(moduleName));
        }

        if (middlewares.length > 0) {
          router.use(route.path, ...middlewares, route.router);
        } else {
          router.use(route.path, route.router);
        }
      }

      logger.info(`Mounted module: ${moduleName} (${loaded.routes.length} routes, alwaysOn=${isAlwaysOn})`);
    }
  }

  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const mod = this.modules.get(name);
      if (mod?.metadata.dependencies) {
        for (const dep of mod.metadata.dependencies) {
          if (this.modules.has(dep)) {
            visit(dep);
          }
        }
      }
      result.push(name);
    };

    // Visit always-on modules first
    for (const name of ALWAYS_ON_MODULES) {
      if (this.modules.has(name)) visit(name);
    }

    // Then visit all others
    for (const name of this.modules.keys()) {
      visit(name);
    }

    return result;
  }

  getLoadedModules(): string[] {
    return Array.from(this.modules.keys());
  }
}
