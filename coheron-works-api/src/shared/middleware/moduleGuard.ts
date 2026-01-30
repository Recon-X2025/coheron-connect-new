import { Request, Response, NextFunction } from 'express';
import { TenantConfig } from '../models/TenantConfig.js';
import logger from '../utils/logger.js';

// 5-minute in-memory cache for tenant configs
const tenantConfigCache = new Map<string, { modules: string[]; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getEnabledModules(tenantId: string): Promise<string[] | null> {
  const cached = tenantConfigCache.get(tenantId);
  if (cached && cached.expiry > Date.now()) {
    return cached.modules;
  }

  const config = await TenantConfig.findOne({ tenant_id: tenantId, is_active: true });
  if (!config) return null;

  tenantConfigCache.set(tenantId, {
    modules: config.enabled_modules,
    expiry: Date.now() + CACHE_TTL,
  });

  return config.enabled_modules;
}

export function requireModule(moduleName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return next(); // No tenant context — allow access
      }

      const enabledModules = await getEnabledModules(tenantId);
      if (enabledModules === null) {
        return next(); // No config found — graceful default, allow access
      }

      if (!enabledModules.includes(moduleName)) {
        return res.status(403).json({ error: 'Module not enabled for this tenant' });
      }

      next();
    } catch (error) {
      logger.error({ err: error }, 'Module guard error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
