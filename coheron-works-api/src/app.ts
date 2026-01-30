import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/asyncHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { Sentry } from './utils/sentry.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security & performance middleware
app.use(helmet());
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

export default app;
