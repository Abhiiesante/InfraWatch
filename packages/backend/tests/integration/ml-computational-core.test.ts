import { describe, it, expect } from 'vitest';
import { MatrixMath } from '@/engine/matrix-math.engine.js';
import { NeuralNetworkEngine } from '@/engine/neural-network.engine.js';
import { ImageConvolutionEngine } from '@/engine/image-convolution.engine.js';
import { TimeSeriesEngine } from '@/engine/time-series.engine.js';
import { ModelWorkerPipeline } from '@/engine/model-worker.pipeline.js';

describe('Deep Computational Machine Learning & Neural Network Core', () => {
  describe('1. Linear Algebra & Matrix Math Computational Engine', () => {
    it('should perform 2D Matrix Multiplication correctly', () => {
      const A = [
        [1, 2],
        [3, 4],
      ];
      const B = [
        [2, 0],
        [1, 2],
      ];

      const C = MatrixMath.multiply(A, B);
      expect(C).toEqual([
        [4, 4],
        [10, 8],
      ]);
    });

    it('should compute Matrix Transpose and Gaussian LU Inversion', () => {
      const A = [
        [4, 7],
        [2, 6],
      ];

      const AT = MatrixMath.transpose(A);
      expect(AT).toEqual([
        [4, 2],
        [7, 6],
      ]);

      const invA = MatrixMath.invert(A);
      const identity = MatrixMath.multiply(A, invA);

      expect(identity[0][0]).toBeCloseTo(1.0, 3);
      expect(identity[1][1]).toBeCloseTo(1.0, 3);
    });

    it('should compute Cosine Similarity and Softmax Vectors', () => {
      const u = [1, 0, 1];
      const v = [1, 0, 1];

      const sim = MatrixMath.cosineSimilarity(u, v);
      expect(sim).toBeCloseTo(1.0, 3);

      const probs = MatrixMath.softmax([2.0, 1.0, 0.1]);
      const sum = probs.reduce((s, p) => s + p, 0);
      expect(sum).toBeCloseTo(1.0, 3);
      expect(probs[0]).toBeGreaterThan(probs[1]);
    });
  });

  describe('2. Multi-Layer Perceptron (MLP) Deep Neural Network Engine', () => {
    it('should perform forward pass, backpropagation, and loss minimization using Adam Optimizer', () => {
      const nn = new NeuralNetworkEngine(4, 8, 2, ['HIGH', 'LOW']);
      const sample = { features: [0.8, 0.9, 0.7, 0.85], labelIndex: 0 };

      const predBefore = nn.predict(sample.features);
      expect(predBefore.predictedLabel).toBeDefined();

      // Run 5 training epochs
      const dataset = [sample];
      let loss1 = 0;
      let loss5 = 0;

      for (let epoch = 1; epoch <= 5; epoch++) {
        const rec = nn.trainEpoch(dataset, 0.05, 0.9, 0.999, epoch);
        if (epoch === 1) loss1 = rec.loss;
        if (epoch === 5) loss5 = rec.loss;
      }

      expect(loss5).toBeLessThanOrEqual(loss1);
    });
  });

  describe('3. 2D Spatial Image Convolution & Canny Edge Engine', () => {
    it('should compute Sobel gradient fields and Canny edge detection matrix', () => {
      const imageGrid = [
        [10, 10, 10, 200, 200],
        [10, 10, 10, 200, 200],
        [10, 10, 10, 200, 200],
        [10, 10, 10, 200, 200],
        [10, 10, 10, 200, 200],
      ];

      const res = ImageConvolutionEngine.processSobelGradients(imageGrid);
      expect(res.densityPct).toBeGreaterThan(0);
      expect(res.gradientMagnitude.length).toBe(5);

      const canny = ImageConvolutionEngine.cannyEdgeDetect(imageGrid, 20, 50);
      expect(canny.length).toBe(5);
    });
  });

  describe('4. Holt-Winters Time-Series & Mahalanobis Anomaly Engine', () => {
    it('should forecast future time-series values using Triple Exponential Smoothing', () => {
      const series = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
      const result = TimeSeriesEngine.holtWintersForecast(series, 7, 5);

      expect(result.forecast.length).toBe(5);
      expect(result.rmse).toBeGreaterThanOrEqual(0);
      expect(result.forecast[0]).toBeGreaterThan(0);
    });

    it('should calculate Mahalanobis multi-variable anomaly distance', () => {
      const vec = [2.5, 3.8];
      const mean = [1.0, 1.5];
      const cov = [
        [1.0, 0.2],
        [0.2, 1.5],
      ];

      const dist = TimeSeriesEngine.mahalanobisDistance(vec, mean, cov);
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('5. Background Model Worker & Training Pipeline', () => {
    it('should execute multi-epoch background training pipeline and serialize neural weights', async () => {
      const res = await ModelWorkerPipeline.runNeuralNetworkTrainingPipeline('test_nn_pipeline', 5, 0.01);

      expect(res.totalEpochs).toBe(5);
      expect(res.epochHistory.length).toBe(5);
      expect(res.savedWeightsPath).toBeDefined();
    });
  });
});
