import pinoHttp from 'pino-http';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
});
