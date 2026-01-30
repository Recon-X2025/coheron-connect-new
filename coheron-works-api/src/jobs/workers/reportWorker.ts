import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../utils/logger.js';

export interface ReportJobData {
  reportId: string;
  userId: string;
  format: 'csv' | 'pdf' | 'xlsx';
  filters?: Record<string, any>;
}

export function startReportWorker() {
  const worker = new Worker<ReportJobData>(
    'report',
    async (job: Job<ReportJobData>) => {
      const { reportId, format, userId } = job.data;
      logger.info({ reportId, format, userId, jobId: job.id }, 'Processing report job');

      // TODO: Generate report based on reportId and filters
      // 1. Load Report config from DB
      // 2. Query data according to filters
      // 3. Format as CSV/PDF/XLSX
      // 4. Store result and notify user
      logger.info({ reportId, format }, 'Report generated (stub)');
    },
    {
      connection: redisConnection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Report job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Report job failed');
  });

  return worker;
}
