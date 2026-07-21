import { Router, Request, Response, NextFunction } from 'express';
import { assetTypeService } from '@/services/asset-type.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createAssetTypeSchema, updateAssetTypeSchema } from '@/lib/validation.js';

const router = Router();

// GET /api/asset-types
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 50;

      const result = await assetTypeService.listAssetTypes(req.tenantId!, { skip, take });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/asset-types/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assetType = await assetTypeService.getAssetType(parseInt(req.params.id), req.tenantId!);
      res.json(assetType);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/asset-types
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(createAssetTypeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assetType = await assetTypeService.createAssetType(req.tenantId!, req.body);
      res.status(201).json(assetType);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/asset-types/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(updateAssetTypeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assetType = await assetTypeService.updateAssetType(
        parseInt(req.params.id),
        req.tenantId!,
        req.body,
      );
      res.json(assetType);
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/asset-types/:id
router.delete(
  '/:id',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assetTypeService.deleteAssetType(parseInt(req.params.id), req.tenantId!);
      res.json({ message: 'Asset type deleted' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('associated assets')) {
        res.status(400).json({ error: error.message });
        return;
      }
      next(error);
    }
  },
);

export default router;
