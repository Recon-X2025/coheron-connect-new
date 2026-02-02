import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import SagaInstance from '../../models/SagaInstance.js';
import { approvalService } from '../../orchestration/ApprovalService.js';
import logger from '../../shared/utils/logger.js';

export function startSagaWorker() {
  const worker = new Worker(
    'saga',
    async (_job: Job) => {
      // Check for timed-out sagas
      const timedOut = await SagaInstance.find({
        status: 'running',
        timeout_at: { $lte: new Date() },
      });

      for (const instance of timedOut) {
        logger.warn({ sagaId: instance._id, sagaName: instance.saga_name }, 'Saga timed out');
        instance.status = 'failed';
        instance.step_results.push({
          step_name: 'timeout',
          status: 'failed',
          error: 'Saga timed out',
          completed_at: new Date(),
        });
        await instance.save();
      }

      // Process approval gate timeouts
      const processedApprovals = await approvalService.processTimeouts();
      if (processedApprovals > 0) {
        logger.info({ count: processedApprovals }, 'Processed approval gate timeouts');
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  // Schedule periodic timeout check
  import('../queues.js').then(({ sagaQueue }) => {
    sagaQueue.add('timeout-check', {}, {
      repeat: { every: 60000 },
      removeOnComplete: 5,
    }).catch((err: any) => logger.error({ err }, 'Failed to schedule saga timeout check'));
  });

  worker.on('failed', (_job, err) => {
    logger.error({ err }, 'Saga worker job failed');
  });

  return worker;
}
