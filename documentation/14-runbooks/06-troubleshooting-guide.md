# Local Troubleshooting Guide

> **IEKB Section:** 15 — Runbooks  
> **Document:** 06-troubleshooting-guide.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Tech Lead  
> **Status:** Approved

---

## Table of Contents

1. [Database Connection Refused](#database-connection-refused)
2. [Prisma Client Out of Sync](#prisma-client-out-of-sync)
3. [Docker Port Conflicts](#docker-port-conflicts)
4. [Related Documents](#related-documents)

---

## Database Connection Refused

**Symptom:** `npm run dev` in the backend crashes with `Error: P1001: Can't reach database server at localhost:5432`

**Fix:**
1. Check if the local Docker container is running: `docker ps`.
2. If not, run `docker-compose up -d`.
3. If it is running, check if you already have a native PostgreSQL server installed on your Mac/PC that is hijacking port 5432. 
   - Run `lsof -i :5432` (Mac/Linux) to find the PID and kill it.

---

## Prisma Client Out of Sync

**Symptom:** You try to query `prisma.newTable.findMany()` but TypeScript complains that `newTable` does not exist on type `PrismaClient`.

**Fix:**
1. You likely pulled `main` but forgot to generate the local client.
2. Run `npx prisma generate` in the `/backend` directory.
3. If the table itself is missing from the DB, run `npx prisma migrate dev` first.

---

## Docker Port Conflicts

**Symptom:** `docker-compose up` fails with `Bind for 0.0.0.0:6379 failed: port is already allocated.`

**Fix:**
1. You have a local Redis server running natively. 
2. Either stop the local Redis server (`brew services stop redis`) OR change the exposed port in `docker-compose.yml` to something else (e.g., `6380:6379`), and update your `.env` `REDIS_URL` to match.

---

## Related Documents

- **Local Setup:** [Local Development Guide](../03-backend/06-local-development-guide.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
