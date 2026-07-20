import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '@/lib/jwt.js';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors.js';

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      tenantId?: number;
      userId?: number;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing authorization token'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;
    req.tenantId = payload.tenantId;
    req.userId = payload.userId;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.auth) {
    return next(new UnauthorizedError('Authentication required'));
  }
  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ForbiddenError(`Role ${req.auth.role} is not allowed`));
    }

    next();
  };
};
