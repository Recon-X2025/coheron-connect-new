import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../utils/logger.js';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      const { to, subject } = job.data;
      logger.info({ to, subject, jobId: job.id }, 'Processing email job');

      // TODO: Integrate with email provider (SendGrid, SES, etc.)
      // For now, log the email that would be sent
      logger.info({ to, subject }, 'Email sent (stub)');
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Email job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed');
  });

  return worker;
}
