import { Router, Request, Response, NextFunction } from 'express';
import { analyticsService } from '@/services/analytics.service.js';
import { authMiddleware } from '@/middleware/auth.js';

const router = Router();

// GET /api/analytics/metrics
router.get(
  '/metrics',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await analyticsService.getMetrics(req.tenantId!);
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
