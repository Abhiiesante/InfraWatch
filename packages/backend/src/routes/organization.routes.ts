import { Router, Request, Response, NextFunction } from 'express';
import { organizationService } from '@/services/organization.service.js';
import { authMiddleware, requireAuth, requireRole } from '@/middleware/auth.js';

const router = Router();

// GET /api/organizations/current
router.get(
  '/current',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await organizationService.getOrganization(req.tenantId!);
      res.json(org);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/organizations/current/stats
router.get(
  '/current/stats',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await organizationService.getOrganizationStats(req.tenantId!);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/organizations/current
router.put(
  '/current',
  authMiddleware,
  requireRole('ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const org = await organizationService.updateOrganization(req.tenantId!, req.body);
      res.json(org);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
