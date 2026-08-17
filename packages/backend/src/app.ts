import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import rateLimit from 'express-rate-limit';
import { TrainingService } from './services/training.service.js';

// Auto-initialize trained ML model weights from disk storage on boot
TrainingService.initModelWeightsFromDisk();

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
import notificationRoutes from './routes/notification.routes.js';
import aiRoutes from './routes/ai.routes.js';
import anomalyRoutes from './routes/anomaly.routes.js';
import predictionRoutes from './routes/prediction.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';
import workOrderRoutes from './routes/work-order.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import scadaRoutes from './routes/scada-dispatch.routes.js';
import bimRoutes from './routes/bim.routes.js';
import droneRoutes from './routes/drone.routes.js';
import complianceRoutes from './routes/compliance.routes.js';
import mlRoutes from './routes/ml.routes.js';
import copilotRoutes from './routes/copilot.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  // Rate limiting (High limit for industrial real-time telemetry & IoT dashboard polling)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10000, // Allow high throughput for live telemetry & dashboard streams
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Request parsing & logging
  app.use(express.json({ limit: '50mb' }));
  app.use(requestLogger);

  // Global middleware

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '4.0.0',
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
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/ml', mlRoutes);
  app.use('/api/anomalies', anomalyRoutes);
  app.use('/api/predictions', predictionRoutes);
  app.use('/api/telemetry', telemetryRoutes);
  app.use('/api/work-orders', workOrderRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/v4', scadaRoutes);
  app.use('/api/v4', bimRoutes);
  app.use('/api/v4', droneRoutes);
  app.use('/api/v4', complianceRoutes);
  app.use('/api/copilot', copilotRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};
