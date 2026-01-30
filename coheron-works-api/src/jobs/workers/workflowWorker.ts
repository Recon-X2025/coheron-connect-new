import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../utils/logger.js';

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
      const { workflowId, triggeredBy } = job.data;
      logger.info({ workflowId, triggeredBy, jobId: job.id }, 'Processing workflow job');

      // TODO: Execute workflow actions
      // 1. Load Workflow from DB
      // 2. Evaluate conditions against the entity
      // 3. Execute actions in sequence (update_field, send_email, assign, etc.)
      // 4. Create WorkflowRun record with results
      logger.info({ workflowId }, 'Workflow executed (stub)');
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
