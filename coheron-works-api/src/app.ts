import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';
import routes, { initializeRoutes } from './routes/index.js';
import mongoose from 'mongoose';
import { errorHandler } from './shared/middleware/asyncHandler.js';
import { requestLogger } from './shared/middleware/requestLogger.js';
import { auditTrailMiddleware } from './shared/middleware/auditTrail.js';
import { Sentry } from './shared/utils/sentry.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './shared/utils/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & performance middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  originAgentCluster: false,
  hsts: false, // Disable HSTS until SSL is configured
}));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(compression());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// API Documentation (non-production or explicitly enabled)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

// Health check
app.get('/health', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    if (state === 1) {
      res.json({ status: 'ok', database: 'connected' });
    } else {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many auth requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// CSRF protection (double-submit cookie pattern)
if (process.env.NODE_ENV === 'production') {
  const isProduction = process.env.NODE_ENV === 'production';
  const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'coheron-csrf-default-secret',
    cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'x-csrf-token',
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isProduction,
    },
    getSessionIdentifier: (req: express.Request) => req.ip || 'unknown',
    getCsrfTokenFromRequest: (req: express.Request) => req.headers['x-csrf-token'] as string,
  });

  // Endpoint to obtain a CSRF token
  app.get('/api/csrf-token', (req, res) => {
    const token = generateCsrfToken(req, res);
    res.json({ token });
  });

  // Apply CSRF protection, skipping safe methods
  app.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    try {
      doubleCsrfProtection(req, res, next);
    } catch {
      res.status(403).json({ error: 'Invalid CSRF token. Fetch one from GET /api/csrf-token first.' });
    }
  });
}

// Audit trail for API mutations
app.use(auditTrailMiddleware());

// API Routes
app.use('/api', routes);

// Sentry error handler (must be before custom error handler)
Sentry.setupExpressErrorHandler(app);

// Centralized error handler
app.use(errorHandler);

// Serve static frontend in production (single-container deployment)
const publicDir = path.join(__dirname, '..', 'public');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(publicDir));
  app.get('*', (_req, res, next) => {
    if (_req.path.startsWith('/api') || _req.path === '/health') return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// 404 handler for API routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

export async function initApp(): Promise<typeof app> {
  await initializeRoutes();

  // Register orchestration event handlers and sagas
  const { registerAllHandlers } = await import('./orchestration/handlers/index.js');
  const { registerOrderToDeliverySaga } = await import('./orchestration/sagas/orderToDeliverySaga.js');
  const { registerProcureToPaySaga } = await import('./orchestration/sagas/procureToPaySaga.js');
  const { registerOrderToCashSaga, registerMakeToStockSaga, registerHireToRetireSaga, registerIssueToResolutionSaga } = await import('./orchestration/sagas/templates/index.js');
  registerAllHandlers();
  registerOrderToDeliverySaga();
  registerProcureToPaySaga();
  registerOrderToCashSaga();
  registerMakeToStockSaga();
  registerHireToRetireSaga();
  registerIssueToResolutionSaga();

  // Recover stuck sagas after registration
  const { recoverStuckSagas } = await import('./orchestration/SagaRecovery.js');
  const { default: recoveryLogger } = await import('./shared/utils/logger.js');
  recoverStuckSagas().catch((err) => {
    recoveryLogger.error({ err }, 'Saga recovery on startup failed');
  });

  return app;
}

export default app;
