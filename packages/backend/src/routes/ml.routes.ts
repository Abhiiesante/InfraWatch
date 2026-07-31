import { Router, Request, Response, NextFunction } from 'express';
import { ModelStorageService } from '../services/model-storage.service.js';
import { MlDatasetService } from '../services/ml-dataset.service.js';
import { GridSearchEngine } from '../services/grid-search.engine.js';
import { ModelEvaluatorService } from '../services/model-evaluator.service.js';
import { TrainingService } from '../services/training.service.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

// POST /api/ml/train-batch - Execute batch training with dataset extraction & disk serialization
router.post('/train-batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const status = await TrainingService.trainNlpModel(tenantId);
    return res.json({
      message: 'Batch training pipeline completed successfully. Model serialized to disk.',
      status,
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/ml/models - List saved trained model weight files stored on disk
router.get('/models', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await ModelStorageService.listSavedModels();
    return res.json({
      totalModelsOnDisk: models.length,
      models,
    });
  } catch (error) {
    return next(error);
  }
});

// POST /api/ml/evaluate - Run holdout validation evaluation on test set
router.post('/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const audit = await ModelEvaluatorService.evaluateModelOnHoldoutTestSet(tenantId);
    return res.json(audit);
  } catch (error) {
    return next(error);
  }
});

// POST /api/ml/grid-search - Run hyperparameter optimization grid search
router.post('/grid-search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const dataset = await MlDatasetService.extractIncidentDataset(tenantId);
    const result = GridSearchEngine.runGridSearch(dataset);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

// GET /api/ml/export-weights/:modelName - Download trained model weight JSON file
router.get('/export-weights/:modelName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modelName = req.params.modelName;
    const weights = await ModelStorageService.loadModelWeights(modelName);

    if (!weights) {
      return res.status(404).json({ error: `Model weights file for ${modelName} not found on disk` });
    }

    return res.json(weights);
  } catch (error) {
    return next(error);
  }
});

export default router;
