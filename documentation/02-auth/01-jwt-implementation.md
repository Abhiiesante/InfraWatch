# JWT Implementation

> **IEKB Section:** 02 — Auth  
> **Document:** 01-jwt-implementation.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Dual Token Strategy](#dual-token-strategy)
2. [Token Structures](#token-structures)
3. [Token Generation](#token-generation)
4. [Token Verification Middleware](#token-verification-middleware)
5. [Refresh Token Rotation](#refresh-token-rotation)
6. [Frontend Token Handling](#frontend-token-handling)
7. [Security Considerations](#security-considerations)
8. [Related Documents](#related-documents)

---

## Dual Token Strategy

InfraWatch uses a secure dual-token mechanism to balance security (short access windows) with user experience (staying logged in).

| Property | Access Token | Refresh Token |
|----------|-------------|---------------|
| **Format** | JWT (JSON Web Token) | Cryptographically secure random string |
| **Lifespan** | 15 minutes | 7 days |
| **Storage (Client)** | In-memory (React State / Zustand) | `HttpOnly`, `Secure` Cookie |
| **Storage (Server)** | Stateless (not stored) | Hashed and stored in PostgreSQL |
| **Transport** | `Authorization: Bearer <token>` header | Automatic via Cookie |
| **Purpose** | API Authorization | Obtaining new Access Tokens |

---

## Token Structures

### Access Token Payload

The Access Token contains exactly the information needed to authorize a request without querying the database.

```json
{
  "sub": 142,                  // User ID (subject)
  "email": "user@domain.com",  // User Email
  "tenantId": 1,               // Organization ID
  "role": "MANAGER",           // User Role for RBAC
  "iat": 1678886400,           // Issued At (UNIX timestamp)
  "exp": 1678887300,           // Expiration (15 minutes later)
  "iss": "infrawatch-api"      // Issuer
}
```

### Refresh Token Schema (Database)

Refresh tokens are **not** JWTs. They are opaque strings stored as SHA-256 hashes in the database.

```sql
CREATE TABLE "refresh_tokens" (
    "id"          SERIAL       PRIMARY KEY,
    "user_id"     INTEGER      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token_hash"  VARCHAR(64)  NOT NULL UNIQUE,
    "expires_at"  TIMESTAMPTZ  NOT NULL,
    "revoked_at"  TIMESTAMPTZ,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

## Token Generation

```typescript
// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '@/config/env';

export interface TokenPayload {
  sub: number;
  email: string;
  tenantId: number;
  role: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN, // '15m'
    issuer: 'infrawatch-api',
  });
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

---

## Token Verification Middleware

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { AppError } from '@/utils/errors';
import type { TokenPayload } from '@/utils/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    
    // Attach user payload to request for downstream middleware
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('TOKEN_EXPIRED', 'Access token has expired', 401));
    }
    return next(new AppError('INVALID_TOKEN', 'Invalid access token', 401));
  }
};
```

---

## Refresh Token Rotation

When an access token expires, the client calls the `/auth/refresh` endpoint.

```typescript
// src/controllers/auth.controller.ts (Refresh Logic)
async refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) throw new AppError('UNAUTHORIZED', 'No refresh token provided', 401);

    const tokenHash = hashRefreshToken(refreshToken);
    
    // 1. Find token in DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    // 2. Validate token
    if (!storedToken) throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
    if (storedToken.revokedAt) throw new AppError('UNAUTHORIZED', 'Token revoked', 401);
    if (storedToken.expiresAt < new Date()) throw new AppError('UNAUTHORIZED', 'Token expired', 401);
    if (!storedToken.user.isActive) throw new AppError('FORBIDDEN', 'User account deactivated', 403);

    // 3. Token Rotation: Revoke old, create new
    const newRefreshToken = generateRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() }, // Revoke the one just used
      }),
      prisma.refreshToken.create({
        data: {
          userId: storedToken.user.id,
          tokenHash: newHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      }),
    ]);

    // 4. Generate new Access Token
    const newAccessToken = generateAccessToken({
      sub: storedToken.user.id,
      email: storedToken.user.email,
      tenantId: storedToken.user.tenantId,
      role: storedToken.user.role,
    });

    // 5. Set new cookie & return access token
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    next(error);
  }
}
```

---

## Frontend Token Handling

The frontend uses Axios interceptors to automatically handle token attachment and silent refresh.

```typescript
// src/services/api.ts (Frontend)
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Crucial for sending the HttpOnly cookie
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor: Handle 401s and retry
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for the ongoing refresh to finish
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent refresh
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Save new token to state
        useAuthStore.getState().setAccessToken(data.accessToken);

        // Process queue & retry original request
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (cookie expired/invalid) - Force logout
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Security Considerations

1. **Secret Management:** `JWT_SECRET` must be a high-entropy string (e.g., 64 random bytes) stored in AWS Secrets Manager, never in source control.
2. **Algorithm Enforcement:** The backend strictly enforces `HS256` and rejects tokens using `none` or asymmetric algorithms.
3. **Database Hashing:** Refresh tokens are hashed before DB storage to prevent token theft via SQL injection.
4. **Cookie Security:** The refresh cookie uses `SameSite=Strict` to mitigate CSRF, and `Secure` to prevent transmission over HTTP.
5. **Revocation:** Changing a password or deactivating a user instantly revokes all their active refresh tokens.

---

## Related Documents

- **Previous:** [Auth Overview](./00-auth-overview.md)
- **Next:** [Password Security](./02-password-security.md)
- **Tenant Scope:** [Tenant Context](./04-tenant-context.md)
- **Database:** [User Table](../01-database/04-user-table.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
