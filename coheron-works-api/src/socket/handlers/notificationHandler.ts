import type { Server, Socket } from 'socket.io';
import logger from '../../shared/utils/logger.js';

export function registerNotificationHandlers(_io: Server, socket: Socket) {
  const userId = socket.data.userId;
  if (userId) {
    const room = `user:${userId}`;
    socket.join(room);
    logger.info({ socketId: socket.id, room }, 'Joined notification room');
  }

  socket.on('notification:read', (notificationId: string) => {
    logger.info({ socketId: socket.id, notificationId }, 'Notification marked as read');
  });
}
