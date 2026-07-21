import { Request, Response, NextFunction } from 'express';

// Tenant context is extracted from the JWT token in the auth middleware.
// This middleware provides a fallback for unauthenticated routes that
// might receive a tenant hint via header (e.g., login/register).
export const tenantContext = (req: Request, _res: Response, next: NextFunction) => {
  // If tenantId wasn't set by auth middleware, check for header hint
  if (!req.tenantId) {
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader) {
      const parsed = parseInt(tenantIdHeader, 10);
      if (!isNaN(parsed)) {
        req.tenantId = parsed;
      }
    }
  }

  next();
};
