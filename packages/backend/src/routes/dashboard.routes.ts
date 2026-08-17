import { Router, Request, Response, NextFunction } from 'express';
import { dashboardService } from '@/services/dashboard.service.js';
import { authMiddleware } from '@/middleware/auth.js';
import prisma from '@/lib/prisma.js';

const router = Router();

// GET /api/dashboard/stats
router.get(
  '/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardService.getDashboardStats(req.tenantId!);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/dashboard/safety-metrics — Gold-layer aggregated safety metrics
router.get(
  '/safety-metrics',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenantId!;
      const hoursBack = Number(req.query.hours) || 24;
      const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

      const metrics = await prisma.cVSafetyMetricGold.findMany({
        where: {
          tenantId,
          timestamp: { gte: since },
        },
        orderBy: { timestamp: 'asc' },
        include: { camera: { select: { name: true } } },
      });

      // Also aggregate totals across all cameras
      const totals = await prisma.cVSafetyMetricGold.aggregate({
        where: { tenantId, timestamp: { gte: since } },
        _sum: { totalDetections: true, zoneViolations: true },
        _max: { maxActiveAMRs: true },
        _count: true,
      });

      res.json({
        success: true,
        data: {
          timeSeries: metrics.map(m => ({
            id: m.id,
            cameraId: m.cameraId,
            cameraName: m.camera.name,
            timestamp: m.timestamp.toISOString(),
            totalDetections: m.totalDetections,
            zoneViolations: m.zoneViolations,
            maxActiveAMRs: m.maxActiveAMRs,
          })),
          totals: {
            totalDetections: totals._sum.totalDetections || 0,
            zoneViolations: totals._sum.zoneViolations || 0,
            maxActiveAMRs: totals._max.maxActiveAMRs || 0,
            dataPoints: totals._count,
          },
          hoursBack,
          serverTimestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
