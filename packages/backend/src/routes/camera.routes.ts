import { Router, Request, Response, NextFunction } from 'express';
import { cameraService } from '@/services/camera.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createCameraSchema, updateCameraSchema } from '@/lib/validation.js';

const router = Router();

// GET /api/cameras
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 20;
      const assetId = req.query.assetId ? parseInt(req.query.assetId as string) : undefined;

      const result = await cameraService.listCameras(req.tenantId!, { skip, take, assetId });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/cameras/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const camera = await cameraService.getCamera(parseInt(req.params.id), req.tenantId!);
      res.json(camera);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/cameras
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(createCameraSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const camera = await cameraService.createCamera(req.tenantId!, req.body);
      res.status(201).json(camera);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/cameras/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(updateCameraSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const camera = await cameraService.updateCamera(
        parseInt(req.params.id),
        req.tenantId!,
        req.body,
      );
      res.json(camera);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/cameras/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cameraService.deleteCamera(parseInt(req.params.id), req.tenantId!);
      res.json({ message: 'Camera deleted' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
