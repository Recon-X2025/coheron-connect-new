import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import logger from '../shared/utils/logger.js';
import { socketAuthMiddleware } from './auth.js';
import { registerChatHandlers } from './handlers/chatHandler.js';
import { registerNotificationHandlers } from './handlers/notificationHandler.js';
import { registerDashboardHandlers } from './handlers/dashboardHandler.js';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.userId }, 'Socket connected');

    registerChatHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerDashboardHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.IO initialized');
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket() first.');
  }
  return io;
}

export { io };
