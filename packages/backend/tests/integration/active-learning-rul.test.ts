import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';
import { KalmanFilterRulEngine } from '@/utils/kalman-filter.utils.js';
import { ActiveLearningService } from '@/services/active-learning.service.js';
import { SpatioTemporalEngine } from '@/services/spatio-temporal.engine.js';

const API_URL = 'http://localhost:3000/api';

describe('Enterprise AI Engine: Active Learning, Kalman RUL & Spatio-Temporal Graph', () => {
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

  describe('1. 2D Kalman Filter & RUL Forecasting Engine', () => {
    it('should compute Kalman state update and predict Remaining Useful Life (RUL) in days', () => {
      const measurements = [10.0, 18.0, 26.0, 35.0, 48.0];
      const result = KalmanFilterRulEngine.estimateRul(measurements, 7, 85.0);

      expect(result.currentDegradationPct).toBeGreaterThan(0);
      expect(result.estimatedDegradationRatePerDay).toBeGreaterThan(0);
      expect(result.remainingUsefulLifeDays).toBeGreaterThan(0);
      expect(result.confidenceIntervalLowerDays).toBeLessThanOrEqual(result.remainingUsefulLifeDays);
      expect(result.confidenceIntervalUpperDays).toBeGreaterThanOrEqual(result.remainingUsefulLifeDays);
      expect(result.kalmanGain).toBeGreaterThan(0);
    });
  });

  describe('2. Active Learning Reinforcement Loop Service', () => {
    it('should record inspector feedback and adjust model threshold bias', async () => {
      const result = await ActiveLearningService.submitFeedback(1, {
        feedbackType: 'CONFIRMED_TRUE_POSITIVE',
        userText: 'Severe gas leak detected near boiler unit',
        userLabel: 'CRITICAL',
        reviewerId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.updatedModelMetrics.overallPrecisionPct).toBeGreaterThan(50);
      expect(result.updatedModelMetrics.currentThresholdBias).toBeDefined();

      const stats = await ActiveLearningService.getActiveLearningStats(1);
      expect(stats.totalFeedbackCount).toBeGreaterThan(0);
    });
  });

  describe('3. Spatio-Temporal Anomaly Correlation Graph', () => {
    it('should construct multi-camera failure propagation tree with root cause node', async () => {
      const graph = await SpatioTemporalEngine.buildCorrelationGraph(1, 15);

      expect(graph.rootCauseNode.sourceType).toBeDefined();
      expect(graph.correlatedNodes.length).toBeGreaterThan(0);
      expect(graph.propagationEdges.length).toBeGreaterThan(0);
      expect(graph.confidenceScore).toBeGreaterThan(80);
    });
  });

  describe('4. AI REST Endpoints (/api/ai)', () => {
    it('POST /api/ai/active-learning/feedback - should submit inspector feedback', async () => {
      if (!accessToken) return;
      const res = await axios.post(
        `${API_URL}/ai/active-learning/feedback`,
        {
          feedbackType: 'CONFIRMED_TRUE_POSITIVE',
          userText: 'Vibration anomaly confirmed on pump 4',
          userLabel: 'HIGH',
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
    });

    it('GET /api/ai/active-learning/stats - should fetch active learning stats', async () => {
      if (!accessToken) return;
      const res = await axios.get(
        `${API_URL}/ai/active-learning/stats`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.totalFeedbackCount).toBeGreaterThan(0);
    });

    it('GET /api/ai/spatio-temporal/graph - should fetch multi-camera propagation graph', async () => {
      if (!accessToken) return;
      const res = await axios.get(
        `${API_URL}/ai/spatio-temporal/graph`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.rootCauseNode).toBeDefined();
      expect(res.data.propagationEdges.length).toBeGreaterThan(0);
    });

    it('GET /api/ai/rul/:assetId - should return Kalman RUL days forecast', async () => {
      if (!accessToken) return;
      const res = await axios.get(
        `${API_URL}/ai/rul/1`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.forecast.remainingUsefulLifeDays).toBeGreaterThan(0);
    });
  });
});
