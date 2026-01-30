import type { Server, Socket } from 'socket.io';
import logger from '../../utils/logger.js';

export function registerDashboardHandlers(_io: Server, socket: Socket) {
  const tenantId = socket.data.tenantId;
  if (tenantId) {
    const room = `dashboard:${tenantId}`;
    socket.join(room);
    logger.info({ socketId: socket.id, room }, 'Joined dashboard room');
  }

  socket.on('dashboard:subscribe', (tenantId: string) => {
    const room = `dashboard:${tenantId}`;
    socket.join(room);
  });

  socket.on('dashboard:unsubscribe', (tenantId: string) => {
    const room = `dashboard:${tenantId}`;
    socket.leave(room);
  });
}
