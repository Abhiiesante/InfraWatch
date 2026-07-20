import { z } from 'zod';

// Auth
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(255),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Organization
export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(255),
  domain: z.string().min(3).max(255).optional(),
  plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('STARTER'),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

// User
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(255),
  role: z.enum(['ADMIN', 'MANAGER', 'INSPECTOR']).default('INSPECTOR'),
  phone: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'INSPECTOR']).optional(),
});

// Asset
export const createAssetSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(1000).optional(),
  assetTypeId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  address: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

// Camera
export const createCameraSchema = z.object({
  assetId: z.number().int().positive(),
  name: z.string().min(2).max(255),
  cameraType: z.string().min(2).max(100),
  rtspUrl: z.string().url(),
  ipAddress: z.string().optional(),
  config: z.record(z.any()).optional(),
});

export const updateCameraSchema = createCameraSchema.partial();

// Inspection
export const createInspectionSchema = z.object({
  assetId: z.number().int().positive(),
  inspectorId: z.number().int().positive(),
  scheduledDate: z.string().date(),
  notes: z.string().optional(),
});

export const updateInspectionSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  completedAt: z.string().datetime().optional(),
});

// Incident
export const createIncidentSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().optional(),
  assetId: z.number().int().positive().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

export const updateIncidentSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).optional(),
});

// Asset Type
export const createAssetTypeSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().optional(),
  icon: z.string().max(50).optional(),
});
