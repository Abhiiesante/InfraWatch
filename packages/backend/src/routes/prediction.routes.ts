import { Router, Request, Response, NextFunction } from 'express';
import { PredictionService } from '../services/prediction.service.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const skip = parseInt(req.query.skip as string || '0', 10);
    const take = parseInt(req.query.take as string || '20', 10);

    const result = await PredictionService.getPredictions(tenantId, skip, take);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/health-score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const health = await PredictionService.getInfrastructureHealthScore(tenantId);
    return res.json(health);
  } catch (error) {
    return next(error);
  }
});

router.post('/run/:assetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const assetId = parseInt(req.params.assetId, 10);

    const prediction = await PredictionService.analyzeAsset(tenantId, assetId);
    return res.json(prediction);
  } catch (error) {
    return next(error);
  }
});

export default router;
