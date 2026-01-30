import { Queue } from 'bullmq';
import { redisConnection } from '../../jobs/connection.js';
import logger from '../../shared/utils/logger.js';

const emailQueue = new Queue('email', { connection: redisConnection });

export async function executeSendEmail(config: any, _context: any) {
  const { to, subject, body } = config;
  if (!to || !subject) {
    throw new Error('send_email requires to and subject');
  }

  await emailQueue.add('workflow-email', { to, subject, body: body || '' });
  logger.info({ to, subject }, 'Workflow: email queued');
  return { to, subject, queued: true };
}
