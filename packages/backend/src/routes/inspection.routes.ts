import { Router, Request, Response, NextFunction } from 'express';
import { inspectionService } from '@/services/inspection.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createInspectionSchema, updateInspectionSchema } from '@/lib/validation.js';

const router = Router();

// GET /api/inspections
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 20;
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;

      const result = await inspectionService.listInspections(req.tenantId!, {
        skip,
        take,
        assetId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/inspections/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inspection = await inspectionService.getInspection(
        parseInt(req.params.id),
        req.tenantId!,
      );
      res.json(inspection);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/inspections
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(createInspectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inspection = await inspectionService.createInspection(req.tenantId!, req.body);
      res.status(201).json(inspection);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/inspections/:id
router.put(
  '/:id',
  authMiddleware,
  validateRequest(updateInspectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inspection = await inspectionService.updateInspection(
        parseInt(req.params.id),
        req.tenantId!,
        req.body,
      );
      res.json(inspection);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
