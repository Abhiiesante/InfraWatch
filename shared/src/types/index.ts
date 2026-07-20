// Database types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: 'admin' | 'manager' | 'inspector' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface Asset {
  id: string;
  organizationId: string;
  name: string;
  assetTypeId: string;
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface Camera {
  id: string;
  assetId: string;
  name: string;
  streamUrl: string;
  status: 'online' | 'offline' | 'degraded';
  createdAt: Date;
  updatedAt: Date;
}

export interface Inspection {
  id: string;
  assetId: string;
  inspectorId: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Incident {
  id: string;
  organizationId: string;
  assetId: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}
