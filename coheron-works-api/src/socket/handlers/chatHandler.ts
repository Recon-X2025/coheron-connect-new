import type { Server, Socket } from 'socket.io';
import logger from '../../shared/utils/logger.js';

export function registerChatHandlers(io: Server, socket: Socket) {
  socket.on('chat:join', (sessionId: string) => {
    const room = `chat:session:${sessionId}`;
    socket.join(room);
    logger.info({ socketId: socket.id, room }, 'Joined chat room');
  });

  socket.on('chat:leave', (sessionId: string) => {
    const room = `chat:session:${sessionId}`;
    socket.leave(room);
    logger.info({ socketId: socket.id, room }, 'Left chat room');
  });

  socket.on('chat:message', (data: { sessionId: string; message: any }) => {
    const room = `chat:session:${data.sessionId}`;
    io.to(room).emit('chat:message', {
      ...data.message,
      session_id: data.sessionId,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('chat:typing', (data: { sessionId: string; isTyping: boolean }) => {
    const room = `chat:session:${data.sessionId}`;
    socket.to(room).emit('chat:typing', {
      userId: socket.data.userId,
      name: socket.data.name,
      isTyping: data.isTyping,
    });
  });
}
