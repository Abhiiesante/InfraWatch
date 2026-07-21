import { Router, Request, Response, NextFunction } from 'express';
import { reportService } from '@/services/report.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { z } from 'zod';
import { validateRequest } from '@/middleware/validation.js';

const createReportSchema = z.object({
  title: z.string().min(2).max(255),
  type: z.string().min(2).max(50),
  data: z.record(z.any()).optional(),
});

const router = Router();

// GET /api/reports
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 20;

      const result = await reportService.listReports(req.tenantId!, { skip, take });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/reports/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await reportService.getReport(parseInt(req.params.id), req.tenantId!);
      res.json(report);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/reports
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(createReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await reportService.createReport(req.tenantId!, req.body);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
