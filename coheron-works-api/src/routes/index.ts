import express from 'express';
import { ModuleRegistry } from '../shared/ModuleRegistry.js';
import logger from '../shared/utils/logger.js';

const router = express.Router();

const registry = new ModuleRegistry();

export async function initializeRoutes(): Promise<void> {
  await registry.discoverAndLoad();
  registry.mountAll(router);
  logger.info(`All modules loaded: ${registry.getLoadedModules().join(', ')}`);
}

export default router;
