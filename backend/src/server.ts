import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import cron from 'node-cron';

// Import routes
import authRoutes from './routes/auth';
import personaRoutes from './routes/persona';
import trendRoutes from './routes/trends';
import contentRoutes from './routes/content';
import competitorRoutes from './routes/competitor';
import auditRoutes from './routes/audit';
import imageRoutes from './routes/images';
import researchRoutes from './routes/research';
import userRoutes from './routes/user';

// Import services
import { ProfileWatchdogService } from './services/profileWatchdog';
import { TrendMonitorService } from './services/trendMonitor';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Prisma
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Initialize Redis (optional)
export const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

if (redis) {
  redis.on('error', (err: Error) => {
    logger.warn('Redis error (non-critical):', err);
  });

  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.connect().catch(() => {
    logger.warn('Redis connection failed - continuing without Redis');
  });
}

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'connected',
      redis: redis && redis.status === 'ready' ? 'connected' : 'disconnected',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/persona', personaRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/competitor', competitorRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/user', userRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      code: 'NOT_FOUND',
    },
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Initialize scheduled jobs
if (process.env.NODE_ENV === 'production') {
  // Profile Watchdog - runs every 7 days
  cron.schedule('0 0 * * 0', async () => {
    logger.info('Running Profile Watchdog...');
    const watchdog = new ProfileWatchdogService(prisma);
    await watchdog.runWeeklyAudit();
  });

  // Trend Monitor - runs daily
  cron.schedule('0 6 * * *', async () => {
    logger.info('Running Trend Monitor...');
    const monitor = new TrendMonitorService(prisma);
    await monitor.checkTrendingTopics();
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  if (redis) await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  if (redis) await redis.quit();
  process.exit(0);
});

export default app;
