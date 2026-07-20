import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { tenantContext } from './middleware/tenant-context.js';
import logger from './utils/logger.js';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Logging
  app.use(requestLogger);

  // Tenant context extraction
  app.use(tenantContext);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes (placeholder)
  app.use('/api', (_req: Request, res: Response) => {
    res.json({ message: 'InfraWatch API v0.1.0' });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
