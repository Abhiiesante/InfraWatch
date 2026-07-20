# Worker Dockerfile

> **IEKB Section:** 08 — DevOps  
> **Document:** 03-dockerfile-worker.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Puppeteer Dependencies](#puppeteer-dependencies)
3. [Dockerfile Source](#dockerfile-source)
4. [Related Documents](#related-documents)

---

## Overview

The BullMQ Background Worker shares the exact same codebase (and `package.json`) as the Backend API. However, we deploy it using a different Dockerfile because the Worker requires system-level dependencies for **Puppeteer** (Headless Chrome) to generate PDF reports, and **libvips** for Sharp image processing.

Using a unified Dockerfile would bloat the API container unnecessarily. 

---

## Puppeteer Dependencies

Puppeteer requires a massive list of shared libraries (fonts, graphics drivers, X11 libraries) to render Chromium in a headless Alpine environment. 

---

## Dockerfile Source

```dockerfile
# backend/Dockerfile.worker

# -------------------------
# STAGE 1: Builder
# -------------------------
FROM node:18-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

RUN npx prisma generate
COPY . .
RUN npm run build

# Remove devDependencies to prepare for production stage
RUN npm ci --omit=dev && npm cache clean --force

# -------------------------
# STAGE 2: Production Worker
# -------------------------
FROM node:18-alpine AS production

# Install OpenSSL for Prisma, dumb-init for signals
# Install Puppeteer/Chromium dependencies (Warning: Heavily increases image size)
RUN apk add --no-cache \
      openssl \
      dumb-init \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Tell Puppeteer to skip installing its own Chrome and use the Alpine one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Note: Puppeteer requires special flags to run as non-root, or must be run as root.
# For V0, we use a dedicated 'node' user but pass '--no-sandbox' in the code.
USER node

# Instead of starting the API server, start the worker script
CMD ["dumb-init", "node", "dist/worker.js"]
```

---

## Related Documents

- **Architecture:** [BullMQ Architecture](../06-workers/00-bullmq-architecture.md)
- **Worker Implementations:** [Report Worker](../06-workers/01-report-generation-worker.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
