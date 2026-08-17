import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '@/lib/jwt.js';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors.js';
import prisma from '@/lib/prisma.js';
import { requestContext } from '@/lib/context.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
      tenantId?: number;
      userId?: number;
    }
  }
}

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Dev fallback: if no token and we're in development, use default tenant
    if (process.env.NODE_ENV !== 'production') {
      return applyDevFallback(req, next);
    }
    return next(new UnauthorizedError('Missing authorization token'));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.auth = payload;

    const tenantId = Number(payload.tenantId);
    const userId = Number(payload.userId);

    // Validate that the tenantId exists in database
    const org = await prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!org) {
      return next(new ForbiddenError('Invalid tenant or tenant does not exist'));
    }

    req.tenantId = tenantId;
    req.userId = userId;
    Object.defineProperty(req, 'userId', { value: userId, writable: true, configurable: true, enumerable: true });
    Object.defineProperty(req, 'tenantId', { value: tenantId, writable: true, configurable: true, enumerable: true });

    requestContext.run({ tenantId, userId }, () => {
      next();
    });
  } catch (error) {
    // Dev fallback on token errors (expired, invalid, etc.)
    if (process.env.NODE_ENV !== 'production') {
      return applyDevFallback(req, next);
    }
    next(error);
  }
};

/**
 * Dev-only fallback: assigns the first organization and admin user
 * so the app can be browsed without valid auth tokens during development.
 */
async function applyDevFallback(req: Request, next: NextFunction) {
  try {
    // Try to get actual dev user
    const org = await prisma.organization.findFirst({ select: { id: true } }).catch(() => null);
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } }).catch(() => null);

    const tenantId = org?.id || 1;
    const userId = user?.id || 1;

    req.tenantId = tenantId;
    req.userId = userId;
    req.auth = { userId, tenantId, email: 'dev@infrawatch.local', role: 'ADMIN', type: 'access' };
    Object.defineProperty(req, 'userId', { value: userId, writable: true, configurable: true, enumerable: true });
    Object.defineProperty(req, 'tenantId', { value: tenantId, writable: true, configurable: true, enumerable: true });

    requestContext.run({ tenantId, userId }, () => {
      next();
    });
  } catch (err) {
    // Just force it instead of throwing 401, so users can see the UI even if DB is totally dead
    req.tenantId = 1;
    req.userId = 1;
    req.auth = { userId: 1, tenantId: 1, email: 'dev@infrawatch.local', role: 'ADMIN', type: 'access' };
    next();
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth) {
    return next(new UnauthorizedError('Authentication required'));
  }
  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new ForbiddenError(`Role ${req.auth.role} is not allowed`));
    }

    next();
  };
};
