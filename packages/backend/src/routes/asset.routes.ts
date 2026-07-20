import { Router, Request, Response, NextFunction } from 'express';
import { assetService } from '@/services/asset.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createAssetSchema, updateAssetSchema } from '@/lib/validation.js';

const router = Router();

// GET /api/assets
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 20;

      const result = await assetService.listAssets(req.tenantId!, { skip, take });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/assets/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await assetService.getAsset(parseInt(req.params.id), req.tenantId!);
      res.json(asset);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/assets
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(createAssetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await assetService.createAsset(req.tenantId!, req.userId!, req.body);
      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/assets/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(updateAssetSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const asset = await assetService.updateAsset(
        parseInt(req.params.id),
        req.tenantId!,
        req.body,
      );
      res.json(asset);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/assets/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assetService.deleteAsset(parseInt(req.params.id), req.tenantId!);
      res.json({ message: 'Asset deleted' });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
