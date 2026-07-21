export const ASSET_STATUS = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const;

export const USER_ROLES = ['ADMIN', 'MANAGER', 'INSPECTOR'] as const;

export const INSPECTION_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;

export const INCIDENT_SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const INCIDENT_STATUS = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const;
