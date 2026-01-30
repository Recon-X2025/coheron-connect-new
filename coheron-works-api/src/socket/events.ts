import { getIO } from './index.js';
import logger from '../shared/utils/logger.js';

export function emitChatMessage(sessionId: string, message: any) {
  try {
    const io = getIO();
    io.to(`chat:session:${sessionId}`).emit('chat:message', {
      ...message,
      session_id: sessionId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to emit chat message (Socket.IO may not be initialized)');
  }
}

export function emitNotification(userId: string, notification: any) {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to emit notification (Socket.IO may not be initialized)');
  }
}

export function emitDashboardUpdate(tenantId: string, data: any) {
  try {
    const io = getIO();
    io.to(`dashboard:${tenantId}`).emit('dashboard:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to emit dashboard update (Socket.IO may not be initialized)');
  }
}
