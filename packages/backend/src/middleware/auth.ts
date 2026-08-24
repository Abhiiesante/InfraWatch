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

// In-memory tenant validation cache with 10-minute TTL to eliminate per-request DB latency
const verifiedTenantCache = new Map<number, number>();

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

    // Fast-path: Check in-memory cache first (<0.05ms response)
    const cachedAt = verifiedTenantCache.get(tenantId);
    const isCacheValid = cachedAt && (Date.now() - cachedAt < 10 * 60 * 1000);

    if (!isCacheValid) {
      try {
        const orgPromise = prisma.organization.findUnique({
          where: { id: tenantId },
          select: { id: true },
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
        const org = await Promise.race([orgPromise, timeoutPromise]);

        if (org || tenantId === 1) {
          verifiedTenantCache.set(tenantId, Date.now());
        } else if (process.env.NODE_ENV === 'production') {
          return next(new ForbiddenError('Invalid tenant or tenant does not exist'));
        }
      } catch {
        // Allow request through in dev or when Supabase pooler has transient spike
        verifiedTenantCache.set(tenantId, Date.now());
      }
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

let cachedDefaultTenantId: number | null = null;
let cachedDefaultUserId: number | null = null;

/**
 * Dev-only fallback: dynamically assigns the active organization and admin user
 * so the app can be browsed without valid auth tokens during development.
 */
async function applyDevFallback(req: Request, next: NextFunction) {
  // 1. Honor explicit x-tenant-id header if provided
  const headerTenantId = req.headers['x-tenant-id'];
  let tenantId = headerTenantId ? parseInt(headerTenantId as string, 10) : NaN;

  // 2. Discover default organization if cache empty
  if (isNaN(tenantId)) {
    if (!cachedDefaultTenantId) {
      try {
        const firstOrg = await prisma.organization.findFirst({
          select: { id: true, users: { take: 1, select: { id: true } } },
        });
        if (firstOrg) {
          cachedDefaultTenantId = firstOrg.id;
          if (firstOrg.users[0]) cachedDefaultUserId = firstOrg.users[0].id;
        }
      } catch {
        // ignore DB transient error
      }
    }
    tenantId = cachedDefaultTenantId || 270;
  }

  const userId = cachedDefaultUserId || 1;

  req.tenantId = tenantId;
  req.userId = userId;
  req.auth = { userId, tenantId, email: 'admin@infrawatch.dev', role: 'ADMIN', type: 'access' };
  Object.defineProperty(req, 'userId', { value: userId, writable: true, configurable: true, enumerable: true });
  Object.defineProperty(req, 'tenantId', { value: tenantId, writable: true, configurable: true, enumerable: true });

  requestContext.run({ tenantId, userId }, () => {
    next();
  });
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
