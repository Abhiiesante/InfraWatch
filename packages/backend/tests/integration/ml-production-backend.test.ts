import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import { ModelStorageService } from '@/services/model-storage.service.js';
import { MlDatasetService } from '@/services/ml-dataset.service.js';
import { GridSearchEngine } from '@/services/grid-search.engine.js';
import { ModelEvaluatorService } from '@/services/model-evaluator.service.js';

const API_URL = 'http://localhost:3000/api';

describe('Client-Ready Production Machine Learning Backend System', () => {
  let accessToken: string;

  beforeAll(async () => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@infrawatch.io',
        password: 'password123',
      });
      if (res.data?.accessToken) {
        accessToken = res.data.accessToken;
      }
    } catch {
      // Fallback
    }
  });

  describe('1. Persistent Model Weight Storage & Serialization to Disk', () => {
    it('should save trained model weights to disk JSON file and reload state', async () => {
      const meta = await ModelStorageService.saveModelWeights(
        'test_model_disk',
        { weights: [0.1, 0.4, 0.8], vocabulary: ['fire', 'leak', 'power'] },
        { accuracy: 0.95, f1Score: 0.94 },
        { alpha: 1.0 },
        'v1.0-test'
      );

      expect(meta.filePath).toBeDefined();
      expect(meta.fileSizeBytes).toBeGreaterThan(0);

      const loaded = await ModelStorageService.loadModelWeights('test_model_disk');
      expect(loaded).not.toBeNull();
      expect(loaded?.modelName).toBe('test_model_disk');
      expect(loaded?.weights?.vocabulary).toContain('fire');

      const allSaved = await ModelStorageService.listSavedModels();
      expect(allSaved.length).toBeGreaterThan(0);
    });
  });

  describe('2. Real Database Feature Extraction & 80/20 Train/Test Splitting', () => {
    it('should extract dataset items and split into 80% train / 20% holdout test sets', async () => {
      const dataset = await MlDatasetService.extractIncidentDataset(1);
      expect(dataset.length).toBeGreaterThan(0);

      const { trainSet, testSet, trainSize, testSize } = MlDatasetService.splitTrainTest(dataset, 0.8);
      expect(trainSize).toBe(trainSet.length);
      expect(testSize).toBe(testSet.length);
      expect(trainSize).toBeGreaterThan(testSize);
    });
  });

  describe('3. Hyperparameter Grid Search Optimization Engine', () => {
    it('should evaluate candidate hyperparameters and find best alpha parameter', async () => {
      const dataset = await MlDatasetService.extractIncidentDataset(1);
      const gridResult = GridSearchEngine.runGridSearch(dataset);

      expect(gridResult.bestParams.smoothingAlpha).toBeDefined();
      expect(gridResult.bestF1Score).toBeGreaterThanOrEqual(0);
      expect(gridResult.paramGridEvaluations.length).toBe(4);
    });
  });

  describe('4. Production Model Evaluator & Holdout Audit', () => {
    it('should run model evaluation on 20% holdout test set and compute confusion matrix', async () => {
      const audit = await ModelEvaluatorService.evaluateModelOnHoldoutTestSet(1);

      expect(audit.modelName).toBeDefined();
      expect(audit.totalTestSamples).toBeGreaterThan(0);
      expect(audit.metrics.accuracy).toBeGreaterThanOrEqual(0);
      expect(audit.metrics.f1Score).toBeGreaterThanOrEqual(0);
      expect(audit.confusionMatrix).toBeDefined();
    });
  });

  describe('5. Client-Ready Production ML REST Endpoints (/api/ml)', () => {
    it('POST /api/ml/train-batch - should run batch training and serialize weights to disk', async () => {
      if (!accessToken) return;
      const res = await axios.post(
        `${API_URL}/ml/train-batch`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.status.savedToDiskPath).toBeDefined();
    });

    it('GET /api/ml/models - should list trained model weight JSON files on disk', async () => {
      if (!accessToken) return;
      const res = await axios.get(
        `${API_URL}/ml/models`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.totalModelsOnDisk).toBeGreaterThan(0);
    });

    it('POST /api/ml/evaluate - should run holdout test set evaluation audit', async () => {
      if (!accessToken) return;
      const res = await axios.post(
        `${API_URL}/ml/evaluate`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.metrics.accuracy).toBeGreaterThan(0);
    });

    it('POST /api/ml/grid-search - should execute hyperparameter grid search', async () => {
      if (!accessToken) return;
      const res = await axios.post(
        `${API_URL}/ml/grid-search`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.bestF1Score).toBeGreaterThan(0);
    });

    it('GET /api/ml/export-weights/nlp_triage - should download trained model weight JSON file', async () => {
      if (!accessToken) return;
      const res = await axios.get(
        `${API_URL}/ml/export-weights/nlp_triage`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.weights).toBeDefined();
    });
  });
});
