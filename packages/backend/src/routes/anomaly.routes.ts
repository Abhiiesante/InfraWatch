import { Router, Request, Response, NextFunction } from 'express';
import { AnomalyService } from '../services/anomaly.service.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const status = req.query.status as string;
    const skip = parseInt(req.query.skip as string || '0', 10);
    const take = parseInt(req.query.take as string || '20', 10);

    const result = await AnomalyService.getAnomalies(tenantId, status, skip, take);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const id = parseInt(req.params.id, 10);

    const anomaly = await AnomalyService.getAnomalyById(tenantId, id);
    if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' });

    return res.json(anomaly);
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const reviewerId = req.userId!;
    const id = parseInt(req.params.id, 10);

    const result = await AnomalyService.confirmAnomaly(tenantId, id, reviewerId);
    return res.json({ success: true, result });
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/dismiss', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const reviewerId = req.userId!;
    const id = parseInt(req.params.id, 10);

    await AnomalyService.dismissAnomaly(tenantId, id, reviewerId);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
