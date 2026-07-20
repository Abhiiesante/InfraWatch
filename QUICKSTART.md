# Quick Start Guide - InfraWatch

This guide will get you running the complete InfraWatch platform in 5 minutes.

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+ (local or Docker)
- Redis 6+ (local or Docker)

## 🐳 Option 1: Docker Compose (Recommended for Quick Start)

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.dev.yml up -d

# Wait ~10 seconds for services to start
```

## 📝 Setup .env Files

```bash
# Backend environment
cp packages/backend/.env.example packages/backend/.env

# Frontend environment  
cp packages/frontend/.env.example packages/frontend/.env
```

Edit `packages/backend/.env`:
```env
# Keep defaults or adjust to match your Docker/local setup
DATABASE_URL=postgresql://infrawatch:infrawatch@localhost:5432/infrawatch_dev
REDIS_URL=redis://localhost:6379

# Generate new JWT secrets:
# On Mac/Linux: openssl rand -base64 32
# Or keep the placeholder (development only!)
JWT_SECRET=your-super-secret-jwt-secret-minimum-32-characters-here
JWT_REFRESH_SECRET=your-super-secret-refresh-secret-minimum-32-characters-here

FRONTEND_URL=http://localhost:5173
```

## 📦 Install Dependencies

```bash
npm install

# This installs all dependencies across the monorepo
# Takes 2-5 minutes depending on connection
```

## 🗄️ Setup Database

```bash
# Generate Prisma client and run migrations
cd packages/backend
npx prisma db push

# Seed demo data (creates org, users, assets, incidents)
npm run seed

cd ../..
```

## 🚀 Start All Services

### Terminal 1: Backend API
```bash
npm run dev -w backend
# Runs on http://localhost:3000
# Health check: curl http://localhost:3000/health
```

### Terminal 2: Frontend
```bash
npm run dev -w frontend
# Runs on http://localhost:5173
# Auto-opens browser
```

### Terminal 3: Workers (Optional)
```bash
npm run dev -w workers
# Processes background jobs (reports, images, notifications)
```

## 🔐 Login to Dashboard

Once the frontend loads, log in with demo credentials:

| Email | Password | Role |
|-------|----------|------|
| admin@demo.local | Demo@Password123 | Admin |
| manager@demo.local | Demo@Password123 | Manager |
| inspector@demo.local | Demo@Password123 | Inspector |

The dashboard shows:
- Organization stats (users, assets, incidents)
- Recent assets
- Recent incidents

## 📡 Test API Endpoints

### Login and Get Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.local",
    "password": "Demo@Password123"
  }'
```

Response includes `accessToken`, `refreshToken`, `user`, `organization`.

### Get Organization Stats (using token)
```bash
curl http://localhost:3000/api/organizations/current/stats \
  -H "Authorization: Bearer <accessToken>"
```

### List Assets
```bash
curl http://localhost:3000/api/assets \
  -H "Authorization: Bearer <accessToken>"
```

### Create Incident
```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical alert",
    "description": "Test incident",
    "severity": "HIGH"
  }'
```

## 🛠️ Useful Commands

```bash
# Install all dependencies
npm install

# Development mode (watch & reload)
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Type checking
npm run type-check

# Linting
npm run lint

# Database management
npm run db:migrate          # Apply migrations
npm run db:seed             # Seed demo data
npm run db:studio           # Open Prisma Studio (visual DB explorer)

# View logs
tail -f logs/combined.log

# Database queries (if using Docker)
docker exec -it infrawatch-postgres psql -U infrawatch -d infrawatch_dev

# Redis CLI (if using Docker)
docker exec -it infrawatch-redis redis-cli
```

## 🔍 What's Running

After starting all services, you have:

- **Backend API** (Port 3000)
  - 27 RESTful endpoints
  - JWT authentication
  - Multi-tenant isolation
  - Request logging

- **Frontend** (Port 5173)
  - React 18 + Vite
  - Zustand state management
  - Axios interceptors for token refresh
  - Protected routes

- **Workers** (Background)
  - Report generation
  - Image processing
  - Notifications
  - BullMQ + Redis

- **PostgreSQL** (Port 5432)
  - Multi-tenant schema
  - 12 tables with relationships
  - Audit logging

- **Redis** (Port 6379)
  - Job queuing (BullMQ)
  - Session cache

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Or if using Docker:
docker logs infrawatch-postgres
```

### Migration Fails
```bash
# Check schema is valid
cd packages/backend
npx prisma validate

# Reset database (⚠️ will delete all data)
npx prisma migrate reset
```

### Token Expired
The frontend automatically refreshes expired tokens using the refresh token. If you get an error:
1. Log out
2. Log in again
3. Check `JWT_SECRET` and `JWT_REFRESH_SECRET` are set

### Frontend Can't Connect to Backend
1. Check backend is running: `curl http://localhost:3000/health`
2. Check `VITE_API_URL` in frontend/.env
3. Check CORS: backend should allow `http://localhost:5173`

## 📚 Next Steps

1. **Create Your First Incident**: Dashboard → Create incident
2. **Add Assets**: View the asset list, add a new infrastructure asset
3. **Create Users**: Add team members with different roles (admin, manager, inspector)
4. **Schedule Inspections**: Create inspection tasks for assets
5. **Monitor Incidents**: Assign incidents to users, add comments

## 🚢 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- Docker containerization
- AWS deployment (ECS, RDS, S3)
- Environment configuration
- Database backups
- Monitoring and alerts

## 📖 Full Documentation

- [Architecture](./00-foundation/03-architecture-overview.md)
- [API Reference](./04-api/00-api-design-principles.md)
- [Database Schema](./01-database/00-data-model-overview.md)
- [Frontend Guide](./05-frontend/00-frontend-architecture.md)

## 💬 Need Help?

Check the documentation folder (00-foundation/) for detailed guides on:
- Database operations
- Authentication flows
- Multi-tenant architecture
- Testing strategies
- Deployment procedures
