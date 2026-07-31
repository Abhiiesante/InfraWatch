import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import axios from 'axios';
import { createApp } from '../../src/app.js';
import { Server } from 'http';
import { AddressInfo } from 'net';

vi.setConfig({ testTimeout: 30000 });

let server: Server;
let API_URL: string;

let accessToken: string;
let refreshToken: string;
let userId: number;
let tenantId: number;
let assetId: number;
let incidentId: number;

const testEmail = `test-${Date.now()}@test.local`;
const testPassword = 'TestPassword123!';
const testOrgName = 'Test Organization';

beforeAll(async () => {
  axios.defaults.validateStatus = () => true;
  await new Promise<void>((resolve) => {
    const app = createApp();
    server = app.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      API_URL = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
});

afterAll(async () => {
  const prisma = (await import('../../src/lib/prisma.js')).default;
  await prisma.$disconnect();
  return new Promise<void>((resolve) => {
    server?.close(() => resolve());
  });
});

describe('InfraWatch E2E Tests', () => {
  describe('Authentication Flow', () => {
    it('should register a new organization and user', async () => {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
        name: 'Test User',
        organizationName: testOrgName,
      });

      expect(response.status).toBe(201);
      expect(response.data.user).toBeDefined();
      expect(response.data.organization).toBeDefined();
      expect(response.data.tokens.accessToken).toBeDefined();
      expect(response.data.tokens.refreshToken).toBeDefined();

      accessToken = response.data.tokens.accessToken;
      refreshToken = response.data.tokens.refreshToken;
      userId = response.data.user.id;
      tenantId = response.data.organization.id;
    });

    it('should login with created credentials', async () => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: testPassword,
      });

      expect(response.status).toBe(200);
      expect(response.data.user.email).toBe(testEmail);
      expect(response.data.tokens.accessToken).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: 'WrongPassword123',
      }, { validateStatus: () => true });
      expect(response.status).toBe(401);
    });

    it('should refresh access token', async () => {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      accessToken = response.data.accessToken;
      if (response.data.refreshToken) {
        refreshToken = response.data.refreshToken;
      }
    });
  });

  describe('Organization Operations', () => {
    it('should get current organization', async () => {
      const response = await axios.get(`${API_URL}/organizations/current`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.name).toBe(testOrgName);
    });

    it('should get organization statistics', async () => {
      const response = await axios.get(`${API_URL}/organizations/current/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.userCount).toBeGreaterThanOrEqual(1);
      expect(response.data.assetCount).toBeGreaterThanOrEqual(0);
      expect(response.data.incidentCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Asset Management', () => {
    let assetTypeId: number;

    it('should create an asset type', async () => {
      const response = await axios.post(
        `${API_URL}/asset-types`,
        {
          name: 'Telecommunications Tower',
          description: 'Cellular and radio towers',
          icon: 'tower',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.id).toBeDefined();
      assetTypeId = response.data.id;
    });

    it('should create an asset', async () => {
      const response = await axios.post(
        `${API_URL}/assets`,
        {
          name: 'Test Tower Alpha-01',
          description: 'Test tower for integration testing',
          assetTypeId,
          status: 'ACTIVE',
          latitude: 40.7128,
          longitude: -74.006,
          address: '123 Test St, Test City',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.name).toBe('Test Tower Alpha-01');
      assetId = response.data.id;
    });

    it('should list assets', async () => {
      const response = await axios.get(`${API_URL}/assets`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { skip: 0, take: 20 },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.assets)).toBe(true);
      expect(response.data.total).toBeGreaterThanOrEqual(0);
    });

    it('should get asset by ID', async () => {
      const response = await axios.get(`${API_URL}/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(assetId);
    });

    it('should update asset', async () => {
      const response = await axios.put(
        `${API_URL}/assets/${assetId}`,
        {
          description: 'Updated description',
          status: 'MAINTENANCE',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.description).toBe('Updated description');
    });
  });

  describe('Incident Management', () => {
    it('should create an incident', async () => {
      const response = await axios.post(
        `${API_URL}/incidents`,
        {
          title: 'Test Critical Alert',
          description: 'This is a test incident',
          assetId,
          severity: 'HIGH',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.title).toBe('Test Critical Alert');
      expect(response.data.severity).toBe('HIGH');
      incidentId = response.data.id;
    });

    it('should list incidents', async () => {
      const response = await axios.get(`${API_URL}/incidents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { skip: 0, take: 20 },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.incidents)).toBe(true);
    });

    it('should get incident by ID', async () => {
      const response = await axios.get(`${API_URL}/incidents/${incidentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.id).toBe(incidentId);
    });

    it('should add comment to incident', async () => {
      const response = await axios.post(
        `${API_URL}/incidents/${incidentId}/comments`,
        {
          content: 'This is a test comment',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.content).toBe('This is a test comment');
    });

    it('should update incident status', async () => {
      const response = await axios.put(
        `${API_URL}/incidents/${incidentId}`,
        {
          status: 'INVESTIGATING',
          severity: 'CRITICAL',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.status).toBe('INVESTIGATING');
    });
  });

  describe('Authorization & Security', () => {
    it('should reject request without token', async () => {
      const response = await axios.get(`${API_URL}/assets`, {
        headers: { Authorization: '' },
        validateStatus: () => true,
      });
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await axios.get(`${API_URL}/assets`, {
        headers: { Authorization: 'Bearer invalid.token.here' },
        validateStatus: () => true,
      });
      expect(response.status).toBe(401);
    });

    it('should enforce tenant isolation', async () => {
      // Create second org
      const org2Response = await axios.post(`${API_URL}/auth/register`, {
        email: `test2-${Date.now()}@test.local`,
        password: testPassword,
        name: 'Test User 2',
        organizationName: 'Test Organization 2',
      });

      const org2Token = org2Response.data.tokens.accessToken;
      const org2Id = org2Response.data.organization.id;

      // Org2 user tries to access Org1 asset
      const response = await axios.get(`${API_URL}/assets/${assetId}`, {
        headers: {
          Authorization: `Bearer ${org2Token}`,
          'x-tenant-id': org2Id.toString(),
        },
        validateStatus: () => true,
      });
      expect([404, 403]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await axios.post(
        `${API_URL}/incidents`,
        {
          title: 'T', // Too short
          severity: 'INVALID', // Invalid enum
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          validateStatus: () => true,
        }
      );
      expect(response.status).toBe(400);
      expect(response.data.code).toBe('VALIDATION_ERROR');
    });

    it('should handle not found errors', async () => {
      const response = await axios.get(`${API_URL}/assets/999999`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        validateStatus: () => true,
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination parameters', async () => {
      const response = await axios.get(`${API_URL}/incidents`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { skip: 0, take: 5 },
      });

      expect(response.status).toBe(200);
      expect(response.data.skip).toBe(0);
      expect(response.data.take).toBe(5);
      expect(response.data.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('V1.1 AI Incident Triage & LLM Reports', () => {
    it('should triage incident text using NLP model', async () => {
      const response = await axios.post(
        `${API_URL}/ai/triage`,
        {
          title: 'Critical gas leak detected in cooling intake line',
          description: 'Emergency hazard near compressor station',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.suggestedSeverity).toBe('CRITICAL');
      expect(response.data.confidence).toBeGreaterThan(80);
    });

    it('should generate executive narrative summary report', async () => {
      const response = await axios.post(
        `${API_URL}/ai/generate-report`,
        {
          reportType: 'EXECUTIVE_SUMMARY',
          dateRange: 'Last 30 Days',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.executiveSummary).toBeDefined();
      expect(response.data.metrics.totalAssets).toBeGreaterThanOrEqual(0);
    });
  });

  describe('V1.2 Computer Vision Anomaly Detection', () => {
    it('should fetch anomaly review queue', async () => {
      const response = await axios.get(`${API_URL}/anomalies`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.anomalies)).toBe(true);
    });
  });

  describe('V2.0 Predictive Maintenance Engine', () => {
    it('should fetch overall infrastructure health score', async () => {
      const response = await axios.get(`${API_URL}/predictions/health-score`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.overallHealth).toBeGreaterThanOrEqual(0);
    });

    it('should run predictive analysis on asset', async () => {
      const response = await axios.post(
        `${API_URL}/predictions/run/${assetId}`,
        {},
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.failureProbability).toBeDefined();
      expect(response.data.recommendedAction).toBeDefined();
    });
  });

  describe('V2.1 IoT Telemetry & Threshold Rules', () => {
    it('should ingest telemetry reading and evaluate threshold rules', async () => {
      const response = await axios.post(
        `${API_URL}/telemetry/ingest`,
        {
          assetId,
          sensorType: 'TEMPERATURE',
          value: 92.5,
          unit: '°C',
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(Number(response.data.value)).toBe(92.5);
    });

    it('should fetch asset telemetry stream', async () => {
      const response = await axios.get(`${API_URL}/telemetry/asset/${assetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('V2.2 Work Orders & SLA Management', () => {
    let workOrderId: number;

    it('should create and dispatch a work order', async () => {
      const response = await axios.post(
        `${API_URL}/work-orders`,
        {
          assetId,
          title: 'Replace Emergency Cooling Intake Pump',
          description: 'High temperature alert triggered on compressor',
          priority: 'CRITICAL',
          slaHours: 1,
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      expect(response.status).toBe(201);
      expect(response.data.title).toBe('Replace Emergency Cooling Intake Pump');
      workOrderId = response.data.id;
    });

    it('should fetch work orders SLA countdown status', async () => {
      const response = await axios.get(`${API_URL}/work-orders/sla`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });

  describe('V3.0 Executive BI Analytics', () => {
    it('should compute operational MTTR and MTBF analytics metrics', async () => {
      const response = await axios.get(`${API_URL}/analytics/metrics`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      expect(response.data.mttrHours).toBeDefined();
      expect(response.data.mtbfDays).toBeDefined();
      expect(response.data.slaCompliance).toBeGreaterThanOrEqual(0);
    }, 15000);
  });
});

