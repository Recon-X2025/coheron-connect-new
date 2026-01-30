import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes/index.js';
import mongoose, { connectDB } from './database/connection.js';
import { errorHandler } from './middleware/asyncHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Connect to MongoDB then start server
let server: any;
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Coheron ERP API Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
  });
});

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      mongoose.connection.close(false).then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
