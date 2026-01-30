import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../utils/logger.js';
import { sendEmail } from '../../services/emailService.js';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
  from?: string;
}

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      const { to, subject, body, html, from } = job.data;
      logger.info({ to, subject, jobId: job.id }, 'Processing email job');

      await sendEmail({
        to,
        subject,
        html: html || body,
        from,
      });
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
