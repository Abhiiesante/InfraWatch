# Backend Setup Guide

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ (`node --version`)
- [ ] npm 9+ (`npm --version`)
- [ ] PostgreSQL 14+ running locally
- [ ] Redis 6+ running locally

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd /path/to/IEKB
npm install
```

This installs all dependencies across the monorepo using npm workspaces.

**Expected output:** ~600+ packages installed in 5-10 minutes

### 2. Configure Environment Variables

Copy the template:
```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env`:

```env
# Database - Change to match your PostgreSQL setup
DATABASE_URL=postgresql://infrawatch:infrawatch@localhost:5432/infrawatch_dev

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets - Generate with: openssl rand -base64 32
JWT_SECRET=<generate-random-string-here>
JWT_REFRESH_SECRET=<generate-random-string-here>

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 3. Create Database

```bash
# Using PostgreSQL CLI
createdb infrawatch_dev
# or 
psql -c "CREATE DATABASE infrawatch_dev;"
```

**Optional:** Create dedicated user
```sql
CREATE USER infrawatch WITH PASSWORD 'infrawatch';
GRANT ALL PRIVILEGES ON DATABASE infrawatch_dev TO infrawatch;
```

### 4. Run Migrations

```bash
npm run db:migrate
```

This creates all database tables from Prisma schema.

### 5. Seed Demo Data

```bash
npm run db:seed
```

This populates with:
- 1 organization
- 3 demo users
- 2 asset types
- 3 assets
- 2 cameras
- 2 inspections
- 2 incidents

### 6. Start Development Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

**Test it:**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "version": "0.1.0"
}
```

## Testing the API

### 1. Get Access Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.local",
    "password": "Demo@Password123"
  }'
```

Response will include `accessToken` and `refreshToken`.

### 2. Use Token to Call Protected Endpoint

```bash
curl http://localhost:3000/api/organizations/current \
  -H "Authorization: Bearer <accessToken>"
```

### 3. Get Organization Statistics

```bash
curl http://localhost:3000/api/organizations/current/stats \
  -H "Authorization: Bearer <accessToken>"
```

Expected response shows user/asset/incident counts.

### 4. List Assets

```bash
curl http://localhost:3000/api/assets \
  -H "Authorization: Bearer <accessToken>" \
  -H "x-tenant-id: 1"
```

## Troubleshooting

### npm install fails

**Problem:** Package installation times out or dependencies not found

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try again with verbose output
npm install --verbose
```

### Database connection fails

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Verify PostgreSQL:**
```bash
psql -U postgres -c "SELECT version();"
```

**Check DATABASE_URL format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

### Seed script fails

**Problem:** `PrismaClientInitializationError`

**Check:**
1. Database URL is correct
2. Migrations ran successfully (`npm run db:migrate`)
3. Tables exist: `\dt` in psql

### JWT errors on login

**Problem:** `UnauthorizedError: Invalid token`

**Solution:**
- Regenerate JWT_SECRET in .env
- Restart server
- Try login again

### CORS errors in browser

**Problem:** Browser blocks requests from frontend

**Solution:** 
Ensure `FRONTEND_URL` in `.env` matches your frontend URL:
```env
FRONTEND_URL=http://localhost:5173
```

## Database Operations

### View data with Prisma Studio

```bash
npm run db:studio
```

Opens `http://localhost:5555` with visual database explorer.

### Run migrations

```bash
# Run pending migrations
npm run db:migrate

# For production deployment
npm run migrate:prod
```

### Reset database (⚠️ destructive)

```bash
npm run db:migrate -- --name reset
```

## File Structure

```
packages/backend/
├── src/
│   ├── config/
│   │   └── env.ts          # Environment variable validation
│   ├── middleware/
│   │   ├── auth.ts         # JWT verification
│   │   ├── validation.ts   # Input validation
│   │   ├── error-handler.ts
│   │   ├── request-logger.ts
│   │   └── tenant-context.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── organization.service.ts
│   │   ├── user.service.ts
│   │   ├── asset.service.ts
│   │   ├── inspection.service.ts
│   │   └── incident.service.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── organization.routes.ts
│   │   ├── user.routes.ts
│   │   ├── asset.routes.ts
│   │   ├── inspection.routes.ts
│   │   └── incident.routes.ts
│   ├── lib/
│   │   ├── prisma.ts       # Prisma client singleton
│   │   ├── errors.ts       # Error classes
│   │   ├── jwt.ts          # JWT utils
│   │   ├── crypto.ts       # Password hashing
│   │   └── validation.ts   # Zod schemas
│   ├── db/
│   │   └── seed.ts         # Demo data seeder
│   ├── utils/
│   │   └── logger.ts       # Winston logging
│   ├── app.ts              # Express app factory
│   └── index.ts            # Server entry point
├── prisma/
│   └── schema.prisma       # Database schema
├── .env.example
├── package.json
└── tsconfig.json
```

## Next Steps

1. **Frontend Setup**: See `packages/frontend/README.md`
2. **Workers Setup**: See `packages/workers/README.md`
3. **Testing**: Run `npm run test` after backend starts
4. **API Documentation**: See main README.md for endpoint list

## Production Checklist

Before deploying to production:

- [ ] Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Use managed PostgreSQL (AWS RDS, etc.)
- [ ] Use managed Redis (AWS ElastiCache, etc.)
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up logging to centralized service
- [ ] Enable rate limiting
- [ ] Configure AWS S3 for file uploads
- [ ] Set up alerting/monitoring
- [ ] Run full test suite
- [ ] Load test with expected traffic
