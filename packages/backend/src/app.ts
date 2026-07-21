import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { tenantContext } from './middleware/tenant-context.js';
import rateLimit from 'express-rate-limit';

// Routes
import authRoutes from './routes/auth.routes.js';
import orgRoutes from './routes/organization.routes.js';
import userRoutes from './routes/user.routes.js';
import assetRoutes from './routes/asset.routes.js';
import inspectionRoutes from './routes/inspection.routes.js';
import incidentRoutes from './routes/incident.routes.js';
import cameraRoutes from './routes/camera.routes.js';
import assetTypeRoutes from './routes/asset-type.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';

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

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  });
  app.use('/api', limiter);

  // Request parsing & logging
  app.use(express.json());
  app.use(requestLogger);

  // Global middleware
  app.use(tenantContext);

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', orgRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/assets', assetRoutes);
  app.use('/api/asset-types', assetTypeRoutes);
  app.use('/api/cameras', cameraRoutes);
  app.use('/api/inspections', inspectionRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
