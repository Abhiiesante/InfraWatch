import { Router, Request, Response, NextFunction } from 'express';
import { dashboardService } from '@/services/dashboard.service.js';
import { authMiddleware } from '@/middleware/auth.js';

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

export default router;
