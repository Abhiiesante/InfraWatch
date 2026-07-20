import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      userId?: string;
    }
  }
}

export const tenantContext = (req: Request, res: Response, next: NextFunction) => {
  // Extract tenant ID from header or subdomain
  const tenantIdHeader = req.headers['x-tenant-id'] as string;

  if (tenantIdHeader) {
    req.tenantId = parseInt(tenantIdHeader);
  }

  next();
};
