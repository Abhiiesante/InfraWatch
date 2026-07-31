import { Router, Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const skip = parseInt(req.query.skip as string || '0', 10);
    const take = parseInt(req.query.take as string || '20', 10);

    const result = await NotificationService.getUserNotifications(tenantId, userId, skip, take);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.put('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    await NotificationService.markAllAsRead(tenantId, userId);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const notificationId = parseInt(req.params.id, 10);

    await NotificationService.markAsRead(tenantId, userId, notificationId);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
