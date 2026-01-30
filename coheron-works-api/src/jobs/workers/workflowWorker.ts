import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../shared/utils/logger.js';
import { executeWorkflow } from '../../services/workflowService.js';

export interface WorkflowJobData {
  workflowId: string;
  triggeredBy: 'schedule' | 'event';
  entityType?: string;
  entityId?: string;
}

export function startWorkflowWorker() {
  const worker = new Worker<WorkflowJobData>(
    'workflow',
    async (job: Job<WorkflowJobData>) => {
      const { workflowId, triggeredBy, entityType, entityId } = job.data;
      logger.info({ workflowId, triggeredBy, jobId: job.id }, 'Processing workflow job');

      await executeWorkflow(workflowId, entityType, entityId);
    },
    {
      connection: redisConnection,
      concurrency: 3,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Workflow job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Workflow job failed');
  });

  return worker;
}
