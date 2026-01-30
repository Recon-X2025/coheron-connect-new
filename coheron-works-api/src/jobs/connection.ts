import IORedis from 'ioredis';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export function createRedisConnection() {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null, // required by BullMQ
  });

  connection.on('error', (err) => {
    logger.error({ err }, 'Redis connection error');
  });

  connection.on('connect', () => {
    logger.info('Connected to Redis');
  });

  return connection;
}

export const redisConnection = createRedisConnection();
