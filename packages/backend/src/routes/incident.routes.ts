import { Router, Request, Response, NextFunction } from 'express';
import { incidentService } from '@/services/incident.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';
import { validateRequest } from '@/middleware/validation.js';
import { createIncidentSchema, updateIncidentSchema } from '@/lib/validation.js';

const router = Router();

// GET /api/incidents
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const take = parseInt(req.query.take as string) || 20;
      const status = req.query.status as string;
      const severity = req.query.severity as string;

      const result = await incidentService.listIncidents(req.tenantId!, {
        skip,
        take,
        status,
        severity,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/incidents/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentService.getIncident(
        parseInt(req.params.id),
        req.tenantId!,
      );
      res.json(incident);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/incidents
router.post(
  '/',
  authMiddleware,
  validateRequest(createIncidentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentService.createIncident(
        req.tenantId!,
        req.userId!,
        req.body,
      );
      res.status(201).json(incident);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/incidents/:id
router.put(
  '/:id',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  validateRequest(updateIncidentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentService.updateIncident(
        parseInt(req.params.id),
        req.tenantId!,
        req.body,
      );
      res.json(incident);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/incidents/:id/assign
router.post(
  '/:id/assign',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.body;
      await incidentService.assignIncident(parseInt(req.params.id), req.tenantId!, userId);
      res.json({ message: 'Incident assigned' });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/incidents/:id/comments
router.post(
  '/:id/comments',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { content } = req.body;
      const comment = await incidentService.addComment(
        parseInt(req.params.id),
        req.tenantId!,
        req.userId!,
        content,
      );
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
