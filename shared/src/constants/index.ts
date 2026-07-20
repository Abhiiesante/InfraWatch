export const ASSET_TYPES = ['tower', 'solar_panel', 'machinery', 'pipeline', 'construction_site'] as const;

export const USER_ROLES = ['admin', 'manager', 'inspector', 'viewer'] as const;

export const INSPECTION_STATUS = ['scheduled', 'in-progress', 'completed', 'cancelled'] as const;

export const INCIDENT_SEVERITY = ['low', 'medium', 'high', 'critical'] as const;

export const INCIDENT_STATUS = ['open', 'investigating', 'resolved', 'closed'] as const;
