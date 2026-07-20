# Backend API Dockerfile

> **IEKB Section:** 08 — DevOps  
> **Document:** 01-dockerfile-backend.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Multi-Stage Build](#multi-stage-build)
3. [Dockerfile Source](#dockerfile-source)
4. [Related Documents](#related-documents)

---

## Overview

The Node.js Express Backend is packaged into a Docker container. To minimize image size and attack surface, we use a **Multi-Stage Build** strategy based on Alpine Linux.

- **Stage 1 (Builder):** Installs all `devDependencies`, generates the Prisma Client, builds the TypeScript code into JavaScript, and then runs `npm ci --omit=dev` to create a clean production `node_modules` folder.
- **Stage 2 (Production):** Copies only the compiled JS, the clean `node_modules`, and necessary config files into a fresh, minimal Alpine image.

---

## Multi-Stage Build

By leaving `devDependencies` (like TypeScript, Jest, Supertest) behind in the builder stage, our final image size is reduced by over 60%, speeding up ECS deployment times and reducing costs.

Furthermore, running the Node.js process as a non-root user (`USER node`) is a critical security requirement.

---

## Dockerfile Source

```dockerfile
# backend/Dockerfile

# -------------------------
# STAGE 1: Builder
# -------------------------
FROM node:18-alpine AS builder

# Install OpenSSL (Required by Prisma on Alpine)
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including dev for building TS)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY . .

# Build TypeScript to JavaScript (Outputs to dist/ directory)
RUN npm run build

# Remove devDependencies to prepare for production stage
RUN npm ci --omit=dev && npm cache clean --force

# -------------------------
# STAGE 2: Production
# -------------------------
FROM node:18-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl dumb-init

# Set working directory
WORKDIR /app

# Set NODE_ENV to production for framework optimizations
ENV NODE_ENV=production
ENV PORT=3000

# Copy compiled code and prod dependencies from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Switch to the less privileged 'node' user provided by the official image
USER node

# Expose the API port
EXPOSE 3000

# Use dumb-init to properly handle SIGTERM signals for graceful shutdowns
CMD ["dumb-init", "node", "dist/server.js"]
```

---

## Related Documents

- **Architecture:** [DevOps Overview](./00-devops-overview.md)
- **Database:** [Prisma Setup](../01-database/01-prisma-setup.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
