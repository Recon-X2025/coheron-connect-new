import dotenv from 'dotenv';
dotenv.config();

import { initSentry } from './shared/utils/sentry.js';
initSentry();

import mongoose, { connectDB } from './database/connection.js';
import logger from './shared/utils/logger.js';
import app from './app.js';
import { startWorkers } from './jobs/index.js';
import { initSocket } from './socket/index.js';

const PORT = process.env.PORT || 3000;

// Connect to MongoDB then start server
let server: any;
connectDB().then(() => {
  startWorkers();
  server = app.listen(PORT, () => {
    logger.info(`Coheron ERP API Server running on http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API Base URL: http://localhost:${PORT}/api`);
  });
  initSocket(server);
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        logger.info('MongoDB connection closed.');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
