import { Worker, Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { redisConnection } from '../connection.js';
import logger from '../../shared/utils/logger.js';
import { ReportGenerationService } from '../../services/reportGenerationService.js';
import { ReportOutput } from '../../models/ReportOutput.js';
import { getIO } from '../../socket/index.js';

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

      // Store generated report to database
      const storedReportId = randomUUID();
      await ReportOutput.create({
        report_id: storedReportId,
        name: reportConfig.title,
        format,
        buffer: buffer.toString('base64'),
        org_id: tenantId,
        created_by: userId,
        metadata: {
          module: reportConfig.module,
          collection: reportConfig.collection,
          filters: job.data.filters,
          size: buffer.length,
        },
      });

      logger.info({ reportId, storedReportId, format }, 'Report stored to database');

      // Notify via Socket.IO if available
      try {
        const io = getIO();
        io.to(`user:${userId}`).emit('report:ready', {
          report_id: storedReportId,
          name: reportConfig.title,
          format,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to emit report:ready (Socket.IO may not be initialized)');
      }

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
