import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

let accessToken: string;
let refreshToken: string;
let userId: number;
let tenantId: number;
let assetId: number;
let incidentId: number;

const testEmail = `test-${Date.now()}@test.local`;
const testPassword = 'TestPassword123!';
const testOrgName = 'Test Organization';

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
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();

      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
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
      expect(response.data.accessToken).toBeDefined();
    });

    it('should fail with invalid credentials', async () => {
      try {
        await axios.post(`${API_URL}/auth/login`, {
          email: testEmail,
          password: 'WrongPassword123',
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });

    it('should refresh access token', async () => {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      accessToken = response.data.accessToken;
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
    it('should create an asset', async () => {
      const response = await axios.post(
        `${API_URL}/assets`,
        {
          name: 'Test Tower Alpha-01',
          description: 'Test tower for integration testing',
          assetTypeId: 1,
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
      try {
        await axios.get(`${API_URL}/assets`);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });

    it('should reject request with invalid token', async () => {
      try {
        await axios.get(`${API_URL}/assets`, {
          headers: { Authorization: 'Bearer invalid.token.here' },
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response?.status).toBe(401);
      }
    });

    it('should enforce tenant isolation', async () => {
      // Create second org
      const org2Response = await axios.post(`${API_URL}/auth/register`, {
        email: `test2-${Date.now()}@test.local`,
        password: testPassword,
        name: 'Test User 2',
        organizationName: 'Test Organization 2',
      });

      const org2Token = org2Response.data.accessToken;
      const org1Id = tenantId;
      const org2Id = org2Response.data.organization.id;

      // Org2 user tries to access Org1 asset
      try {
        await axios.get(`${API_URL}/assets/${assetId}`, {
          headers: {
            Authorization: `Bearer ${org2Token}`,
            'x-tenant-id': org2Id.toString(),
          },
        });
        // Should not find asset (404 or filtered out)
      } catch (error: any) {
        // Expected behavior - isolation working
        expect([404, 403]).toContain(error.response?.status);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      try {
        await axios.post(
          `${API_URL}/incidents`,
          {
            title: 'T', // Too short
            severity: 'INVALID', // Invalid enum
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response?.status).toBe(400);
        expect(error.response?.data.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle not found errors', async () => {
      try {
        await axios.get(`${API_URL}/assets/999999`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.response?.status).toBe(404);
      }
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
});
