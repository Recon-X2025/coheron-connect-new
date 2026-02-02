import { reportQueue } from './queues.js';
import ScheduledReport from '../models/ScheduledReport.js';
import logger from '../shared/utils/logger.js';

// Parse simple cron to next run date (supports: daily HH:MM, weekly DOW HH:MM, monthly DD HH:MM)
function getNextRun(cron: string, from: Date = new Date()): Date {
  const parts = cron.trim().split(/\s+/);
  const next = new Date(from);
  next.setSeconds(0, 0);

  if (parts.length === 2) {
    // Daily: "HH:MM"
    const [h, m] = parts[0] === 'daily' ? parts[1].split(':').map(Number) : parts.map(Number);
    next.setHours(h, m);
    if (next <= from) next.setDate(next.getDate() + 1);
  } else if (parts[0] === 'weekly') {
    const dow = parseInt(parts[1]) || 1; // 0=Sun, 1=Mon, ...
    const [h, m] = (parts[2] || '08:00').split(':').map(Number);
    next.setHours(h, m);
    while (next.getDay() !== dow || next <= from) next.setDate(next.getDate() + 1);
  } else if (parts[0] === 'monthly') {
    const day = parseInt(parts[1]) || 1;
    const [h, m] = (parts[2] || '08:00').split(':').map(Number);
    next.setDate(day);
    next.setHours(h, m);
    if (next <= from) next.setMonth(next.getMonth() + 1);
  } else {
    // Default: next day at 8AM
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0);
  }

  return next;
}

export async function checkScheduledReports(): Promise<number> {
  const now = new Date();
  const dueReports = await ScheduledReport.find({
    is_active: true,
    next_run: { $lte: now },
  }).lean();

  let queued = 0;

  for (const report of dueReports) {
    try {
      await reportQueue.add('scheduled-report', {
        reportId: report.report_id,
        userId: report.created_by?.toString() || '',
        format: report.format,
        filters: report.filters,
        tenantId: report.tenant_id.toString(),
        scheduled: true,
        recipients: report.recipients,
        reportConfig: {
          title: report.name,
          module: report.module,
          collection: report.report_collection,
          columns: report.columns,
        },
      });

      // Update next_run
      const nextRun = getNextRun(report.cron_expression, now);
      await ScheduledReport.updateOne({ _id: report._id }, { last_run: now, next_run: nextRun });
      queued++;
    } catch (err: any) {
      logger.error({ reportId: report._id, err: err.message }, 'Failed to queue scheduled report');
      await ScheduledReport.updateOne({ _id: report._id }, { last_run: now, last_status: 'failed' });
    }
  }

  if (queued > 0) logger.info({ queued }, 'Scheduled reports enqueued');
  return queued;
}
