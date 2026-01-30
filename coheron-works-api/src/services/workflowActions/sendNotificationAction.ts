import { emitNotification } from '../../socket/events.js';
import logger from '../../shared/utils/logger.js';

export async function executeSendNotification(config: any, _context: any) {
  const { userId, title, message, type } = config;
  if (!userId) {
    throw new Error('send_notification requires userId');
  }

  emitNotification(userId, { title, message, type: type || 'info' });
  logger.info({ userId, title }, 'Workflow: notification sent');
  return { userId, title, sent: true };
}
