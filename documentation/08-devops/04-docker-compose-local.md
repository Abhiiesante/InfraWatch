# Local Development Environment (Docker Compose)

> **IEKB Section:** 08 — DevOps  
> **Document:** 04-docker-compose-local.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Docker Compose Configuration](#docker-compose-configuration)
3. [Developer Workflow](#developer-workflow)
4. [Related Documents](#related-documents)

---

## Overview

To guarantee that "it works on my machine" translates to "it works in production," we use `docker-compose` to orchestrate the entire InfraWatch stack locally.

The local stack includes:
- PostgreSQL 15
- Redis 7
- API Server (using `nodemon` / `ts-node` for hot-reloading)
- Background Worker (using `nodemon`)
- Frontend Web App (using Vite Dev Server)
- LocalStack (Optional, for mocking AWS S3/SES locally)

---

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 1. Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: infrawatch_user
      POSTGRES_PASSWORD: secret_password
      POSTGRES_DB: infrawatch_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  # 2. Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # 3. Backend API (Hot Reloading)
  api:
    build:
      context: ./backend
      # We don't use the multi-stage Dockerfile here, 
      # we mount the local folder and run npm run dev
      dockerfile: Dockerfile.dev 
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      DATABASE_URL: postgresql://infrawatch_user:secret_password@postgres:5432/infrawatch_dev
      REDIS_URL: redis://redis:6379
      PORT: 3000
    depends_on:
      - postgres
      - redis

  # 4. Background Worker (Hot Reloading)
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    command: npm run dev:worker
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      DATABASE_URL: postgresql://infrawatch_user:secret_password@postgres:5432/infrawatch_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  # 5. Frontend (Vite)
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost:3000/api
    depends_on:
      - api

volumes:
  pgdata:
```

---

## Developer Workflow

1. **Start the Stack:**
   ```bash
   docker-compose up -d
   ```
2. **Run Migrations:**
   ```bash
   docker-compose exec api npx prisma migrate dev
   ```
3. **Seed Database:**
   ```bash
   docker-compose exec api npm run seed
   ```
4. **View Logs:**
   ```bash
   docker-compose logs -f api worker
   ```
5. **Tear Down:**
   ```bash
   docker-compose down -v # -v deletes the database volume to start fresh
   ```

---

## Related Documents

- **Database:** [Prisma Setup](../01-database/01-prisma-setup.md)
- **Architecture:** [DevOps Overview](./00-devops-overview.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
