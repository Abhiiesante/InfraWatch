import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { tenantContext } from './middleware/tenant-context.js';
import logger from './utils/logger.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import organizationRoutes from './routes/organization.routes.js';
import userRoutes from './routes/user.routes.js';
import assetRoutes from './routes/asset.routes.js';
import inspectionRoutes from './routes/inspection.routes.js';
import incidentRoutes from './routes/incident.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Logging
  app.use(requestLogger);

  // Tenant context extraction
  app.use(tenantContext);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/inspections', inspectionRoutes);
  app.use('/api/incidents', incidentRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
