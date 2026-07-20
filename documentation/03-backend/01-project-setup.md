# Backend Project Setup & Configuration

> **IEKB Section:** 03 — Backend  
> **Document:** 01-project-setup.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [TypeScript Configuration](#typescript-configuration)
3. [Nodemon & Development Scripts](#nodemon--development-scripts)
4. [Application Entry Points](#application-entry-points)
5. [Graceful Shutdown](#graceful-shutdown)
6. [Related Documents](#related-documents)

---

## Environment Variables

InfraWatch uses the `dotenv` package in development and native environment variables in production. All environment variables are **strictly validated at startup** using Zod.

If a required variable is missing or malformed, the application will crash immediately (fail-fast principle).

```typescript
// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file if it exists (local dev)
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis (BullMQ / Rate Limiting)
  REDIS_URL: z.string().url(),
  
  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  
  // AWS (S3 / SES)
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string(),
  
  // CORS
  FRONTEND_URL: z.string().url(),
});

// This will throw and crash the app if validation fails
export const env = envSchema.parse(process.env);
```

---

## TypeScript Configuration

The backend uses strict TypeScript compilation. Path aliases (e.g., `@/utils`) are configured both in `tsconfig.json` and handled at runtime using `tsconfig-paths`.

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    
    // Strictness
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    
    // Path Aliases
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
```

---

## Nodemon & Development Scripts

For local development, we use `ts-node-dev` (or `tsx`) to provide fast restarts without full compilation steps.

```json
// backend/package.json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "lint": "eslint src/**/*.ts",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

---

## Application Entry Points

The application is split into two entry points to facilitate testing: `app.ts` (Express setup) and `server.ts` (Network binding).

### Express App Setup (app.ts)

```typescript
// src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { env } from '@/config/env';
import { errorHandler } from '@/middleware/error';
import { notFoundHandler } from '@/middleware/notFound';

// Import routers
import { authRoutes } from '@/modules/auth/auth.routes';
import { assetRoutes } from '@/modules/assets/asset.routes';
// ... other imports

export const app = express();

// 1. Global Middleware
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true, // Required for HttpOnly cookies
}));
app.use(express.json());
app.use(cookieParser());

// 2. Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// 3. API Routes
const v1Router = express.Router();
v1Router.use('/auth', authRoutes);
v1Router.use('/assets', assetRoutes);
app.use('/api/v1', v1Router);

// 4. Fallback & Error Handling
app.use(notFoundHandler);
app.use(errorHandler);
```

### Server Binding (server.ts)

```typescript
// src/server.ts
import { app } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';

async function bootstrap() {
  try {
    // Verify external connections before binding port
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    await redis.ping();
    logger.info('Redis connected successfully');

    const server = app.listen(env.PORT, () => {
      logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
    
    // Setup graceful shutdown handles here...
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
```

---

## Graceful Shutdown

In a containerized environment (Kubernetes/Docker), the application must handle `SIGINT` and `SIGTERM` signals to shut down gracefully, ensuring no inflight requests are dropped and database connections are closed cleanly.

```typescript
// Add to server.ts
function setupGracefulShutdown(server: Server) {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // 1. Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error during HTTP server closure', err);
        process.exit(1);
      }
      
      logger.info('HTTP server closed');
      
      try {
        // 2. Close database and cache connections
        await prisma.$disconnect();
        await redis.quit();
        logger.info('Database and Redis connections closed');
        
        process.exit(0);
      } catch (dbErr) {
        logger.error('Error closing external connections', dbErr);
        process.exit(1);
      }
    });
    
    // Fallback timeout in case connections hang
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 10000); // 10 seconds
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

---

## Related Documents

- **Previous:** [Backend Overview](./00-backend-overview.md)
- **Next:** [Error Handling](./02-error-handling.md)
- **Logging:** [Logging Guide](../09-observability/01-logging-guide.md)
- **DevOps:** [Docker Setup](../09-devops/01-docker-setup.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

