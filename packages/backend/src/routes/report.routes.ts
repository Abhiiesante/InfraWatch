import { Router, Request, Response, NextFunction } from 'express';
import { reportService } from '@/services/report.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { z } from 'zod';
import { validateRequest } from '@/middleware/validation.js';

const createReportSchema = z.object({
  title: z.string().min(2).max(255),
  type: z.string().min(2).max(50),
  format: z.enum(['PDF', 'CSV']).optional(),
  domain: z.string().optional(),
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

// GET /api/reports/:id/download
router.get(
  '/:id/download',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exportData = await reportService.generateExportDownload(parseInt(req.params.id), req.tenantId!);
      res.setHeader('Content-Type', exportData.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.send(exportData.content);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/reports (Async generation)
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER', 'INSPECTOR'),
  validateRequest(createReportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await reportService.createReportAsync(req.tenantId!, req.body);
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
