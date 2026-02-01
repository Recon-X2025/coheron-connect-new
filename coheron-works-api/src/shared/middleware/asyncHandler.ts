import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';
import { Sentry } from '../utils/sentry.js';
import { AppError } from '../errors.js';

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const log = (req as any).log || logger;
  log.error({ err }, 'Request error');

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(400).json({ error: `Duplicate value for ${field}` });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e: any) => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages });
  }

  // Mongoose cast error (invalid ObjectId etc)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ${err.path}: ${err.value}` });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, code: err.code });
  }

  const status = err.status || 500;
  if (status >= 500) {
    Sentry.captureException(err);
  }

  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}
