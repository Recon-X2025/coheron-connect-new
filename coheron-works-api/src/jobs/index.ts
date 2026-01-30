import logger from '../utils/logger.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { startReportWorker } from './workers/reportWorker.js';
import { startWorkflowWorker } from './workers/workflowWorker.js';

export function startWorkers() {
  if (process.env.ENABLE_WORKERS === 'false') {
    logger.info('Workers disabled via ENABLE_WORKERS=false');
    return;
  }

  try {
    startEmailWorker();
    startReportWorker();
    startWorkflowWorker();
    logger.info('Background job workers started (email, report, workflow)');
  } catch (err) {
    logger.error({ err }, 'Failed to start background workers — Redis may be unavailable');
  }
}
