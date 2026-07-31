import { Router, Request, Response, NextFunction } from 'express';
import { workOrderService } from '@/services/work-order.service.js';
import { authMiddleware, requireRole } from '@/middleware/auth.js';

const router = Router();

// GET /api/work-orders
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string;
      const assignedToId = req.query.assignedToId ? parseInt(req.query.assignedToId as string) : undefined;
      const workOrders = await workOrderService.listWorkOrders(req.tenantId!, { status, assignedToId });
      res.json(workOrders);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/work-orders/sla
router.get(
  '/sla',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slaStatus = await workOrderService.getSLACountdown(req.tenantId!);
      res.json(slaStatus);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/work-orders/:id
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workOrder = await workOrderService.getWorkOrder(parseInt(req.params.id), req.tenantId!);
      res.json(workOrder);
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/work-orders
router.post(
  '/',
  authMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workOrder = await workOrderService.createWorkOrder(req.tenantId!, req.body);
      res.status(201).json(workOrder);
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/work-orders/:id
router.put(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const workOrder = await workOrderService.updateWorkOrder(
        parseInt(req.params.id),
        req.tenantId!,
        req.body,
      );
      res.json(workOrder);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
