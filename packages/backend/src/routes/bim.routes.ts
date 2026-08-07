import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';

const router = Router();

// GET /api/v4/bim/models — Real-time structural data from real DB
router.get(
  '/bim/models',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId || 0;

      const bimModels = await prisma.bimModel.findMany({
        where: { tenantId },
        include: {
          asset: true,
          hotspots: true
        }
      });

      const liveModels = bimModels.map((model: any) => {
        return {
          id: model.id, // Number
          assetId: model.assetId,
          assetName: model.asset?.name || 'Unknown',
          bimFormat: model.bimFormat,
          bimType: model.bimType,
          elementCount: model.elementCount,
          structuralStressMPa: Number(model.structuralStressMPa || 0),
          thermalGradientC: Number(model.thermalGradientC || 0),
          healthRating: model.healthRating,
          magneticFieldTesla: model.magneticFieldTesla ? Number(model.magneticFieldTesla) : undefined,
          plasmaTempMillionC: model.plasmaTempMillionC ? Number(model.plasmaTempMillionC) : undefined,
          cryostatVacuumPa: model.cryostatVacuumPa,
          activeCoils: model.activeCoils,
          totalCoils: model.totalCoils,
          hotspots: model.hotspots.map((h: any) => ({
            elementId: h.elementId,
            stressLevel: h.stressLevel,
            valueMPa: Number(h.valueMPa),
            location: h.location
          })),
          lastBimScanAt: model.updatedAt.toISOString(),
        };
      });

      res.json({
        success: true,
        data: {
          models: liveModels,
          bimEngineStatus: 'GPU_ACCELERATED_WEBGL_READY',
          serverTimestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
