import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../shared/utils/logger.js';

export function startDlqWorker() {
  const worker = new Worker(
    'dlq',
    async (job: Job) => {
      // Log dead-letter items for monitoring
      logger.warn({
        dlqJobId: job.id,
        originalJobId: job.data.original_job_id,
        eventType: job.data.event?.type,
        error: job.data.error,
        failedAt: job.data.failed_at,
      }, 'Dead-letter queue item received');
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on('failed', (_job, err) => {
    logger.error({ err }, 'DLQ worker failed');
  });

  return worker;
}
