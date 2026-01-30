import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    socket.data.userId = decoded.id || decoded.userId || decoded.sub;
    socket.data.tenantId = decoded.tenantId || decoded.tenant_id;
    socket.data.name = decoded.name;
    next();
  } catch (err) {
    logger.warn({ err }, 'Socket auth failed');
    next(new Error('Invalid authentication token'));
  }
}
