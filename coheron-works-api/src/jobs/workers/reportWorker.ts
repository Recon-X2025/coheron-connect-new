import { Worker, Job } from 'bullmq';
import { redisConnection } from '../connection.js';
import logger from '../../shared/utils/logger.js';
import { ReportGenerationService } from '../../services/reportGenerationService.js';

export interface ReportJobData {
  reportId: string;
  userId: string;
  format: 'csv' | 'pdf' | 'xlsx';
  filters?: Record<string, any>;
  tenantId?: string;
  scheduled?: boolean;
  recipients?: string[];
  reportConfig?: {
    title: string;
    module: string;
    collection: string;
    columns: Array<{ field: string; label: string; type?: 'string' | 'number' | 'date' | 'currency' }>;
  };
}

export function startReportWorker() {
  const worker = new Worker<ReportJobData>(
    'report',
    async (job: Job<ReportJobData>) => {
      const { reportId, format, userId, tenantId, reportConfig, scheduled, recipients } = job.data;
      logger.info({ reportId, format, userId, jobId: job.id, scheduled }, 'Processing report job');

      if (!tenantId || !reportConfig) {
        logger.warn({ reportId }, 'Report job missing tenantId or reportConfig');
        return;
      }

      const buffer = await ReportGenerationService.generateReport(
        {
          title: reportConfig.title,
          module: reportConfig.module,
          collection: reportConfig.collection,
          columns: reportConfig.columns,
          filters: job.data.filters,
          tenantId,
        },
        format
      );

      logger.info({ reportId, format, size: buffer.length }, 'Report generated');

      // TODO: Store to S3 or notify via Socket.IO / email to recipients
      // For now just log completion
      if (scheduled && recipients?.length) {
        logger.info({ recipients, reportId }, 'Scheduled report ready for email delivery');
      }
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
