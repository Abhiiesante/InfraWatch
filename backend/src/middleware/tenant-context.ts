import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userId?: string;
    }
  }
}

export const tenantContext = (req: Request, res: Response, next: NextFunction) => {
  // Extract tenant ID from header or subdomain
  const tenantId = req.headers['x-tenant-id'] as string | req.subdomains[0];
  
  if (tenantId) {
    req.tenantId = tenantId;
  }

  next();
};
