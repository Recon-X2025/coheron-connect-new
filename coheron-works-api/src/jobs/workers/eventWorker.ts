import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import { dlqQueue } from '../queues.js';
import { eventBus } from '../../orchestration/EventBus.js';
import logger from '../../shared/utils/logger.js';
import type { DomainEvent } from '../../orchestration/types.js';

export function startEventWorker() {
  const worker = new Worker<DomainEvent>(
    'events',
    async (job: Job<DomainEvent>) => {
      logger.info({ eventType: job.data.type, eventId: job.data.id }, 'Processing event');
      await eventBus.dispatch(job.data);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, eventType: job.data.type }, 'Event job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Event job failed');
    // On final failure, move to DLQ
    if (job && job.attemptsMade >= (job.opts?.attempts || 3)) {
      dlqQueue.add('dead-event', {
        original_job_id: job.id,
        event: job.data,
        error: err.message,
        failed_at: new Date().toISOString(),
      }).catch((e) => logger.error({ e }, 'Failed to add to DLQ'));
    }
  });

  return worker;
}
