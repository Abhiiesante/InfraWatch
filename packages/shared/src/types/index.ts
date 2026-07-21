export interface Organization {
  id: number;
  name: string;
  domain?: string;
  plan: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  tenantId: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'INSPECTOR';
  avatarUrl?: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetType {
  id: number;
  tenantId: number;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Asset {
  id: number;
  tenantId: number;
  assetTypeId: number;
  createdById: number;
  name: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  metadata?: Record<string, any>;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Camera {
  id: number;
  tenantId: number;
  assetId: number;
  name: string;
  cameraType: string;
  rtspUrl: string;
  ipAddress?: string;
  config?: Record<string, any>;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  installationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inspection {
  id: number;
  tenantId: number;
  assetId: number;
  inspectorId: number;
  scheduledDate: Date;
  completedAt?: Date;
  notes?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Incident {
  id: number;
  tenantId: number;
  assetId?: number;
  reporterId: number;
  title: string;
  description?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  attachmentUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}
