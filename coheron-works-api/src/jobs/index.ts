import logger from '../shared/utils/logger.js';
import { startEmailWorker } from './workers/emailWorker.js';
import { startReportWorker } from './workers/reportWorker.js';
import { startWorkflowWorker } from './workers/workflowWorker.js';
import { startEventWorker } from './workers/eventWorker.js';
import { startSagaWorker } from './workers/sagaWorker.js';
import { startDlqWorker } from './workers/dlqWorker.js';
import { checkScheduledReports } from './scheduledReportCron.js';
import { reportQueue } from './queues.js';

export function startWorkers() {
  if (process.env.ENABLE_WORKERS === 'false') {
    logger.info('Workers disabled via ENABLE_WORKERS=false');
    return;
  }

  try {
    startEmailWorker();
    startReportWorker();
    startWorkflowWorker();
    startEventWorker();
    startSagaWorker();
    startDlqWorker();
    // Schedule report check every 5 minutes
    reportQueue.add('check-scheduled-reports', {}, {
      repeat: { every: 300000 },
      removeOnComplete: 5,
    });

    logger.info('Background job workers started (email, report, workflow, events, saga, dlq)');
  } catch (err) {
    logger.error({ err }, 'Failed to start background workers — Redis may be unavailable');
  }
}
