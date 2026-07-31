import { Router, Request, Response, NextFunction } from 'express';
import { telemetryService } from '@/services/telemetry.service.js';
import { satelliteService } from '@/services/satellite.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';

const router = Router();

// POST /api/telemetry/ingest
router.post(
  '/ingest',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reading = await telemetryService.ingestReading(req.tenantId!, req.body);
      res.status(201).json(reading);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/telemetry/asset/:assetId
router.get(
  '/asset/:assetId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const readings = await telemetryService.getAssetTelemetry(
        req.tenantId!,
        parseInt(req.params.assetId),
        limit,
      );
      res.json(readings);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/telemetry/rules
router.get(
  '/rules',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rules = await telemetryService.listRules(req.tenantId!);
      res.json(rules);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/telemetry/rules
router.post(
  '/rules',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await telemetryService.createRule(req.tenantId!, req.body);
      res.status(201).json(rule);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/telemetry/satellite/:assetId
router.get(
  '/satellite/:assetId',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await satelliteService.getLiveSatelliteData(
        req.tenantId!,
        parseInt(req.params.assetId),
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
