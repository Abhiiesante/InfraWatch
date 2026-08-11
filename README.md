# InfraWatch - Asset Monitoring Platform

Production-grade multi-tenant SaaS platform for infrastructure asset monitoring, inspection scheduling, and incident management built with Node.js, React, PostgreSQL, and Redis.


Complete implementation with 27 REST endpoints, JWT authentication, multi-tenant database isolation, background workers, Docker deployment, and comprehensive testing.

## 🚀 Quick Start (5 minutes)

### Option 1: Docker Compose (Recommended)

```bash
# Start database and Redis
docker-compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Configure environment
cp packages/backend/.env.example packages/backend/.env

# Edit .env with docker-compose values:
# DATABASE_URL=postgresql://infrawatch:infrawatch@localhost:5432/infrawatch
# REDIS_URL=redis://localhost:6379

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Terminal 1: Start backend
npm run dev -w backend

# Terminal 2: Start frontend
npm run dev -w frontend

# Terminal 3 (optional): Start workers
npm run dev -w workers
```

Open http://localhost:5173 and login with:
- Email: `admin@demo.local`
- Password: `Demo@Password123`

### Option 2: Local Development (Requires PostgreSQL + Redis)

```bash
# Install dependencies
npm install

# Configure environment
cp packages/backend/.env.example packages/backend/.env

# Update .env with your local PostgreSQL and Redis URLs

# Run migrations and seed
npm run db:migrate
npm run db:seed

# Start all services in watch mode
npm run dev

# Or start individually:
npm run dev -w backend    # http://localhost:3000
npm run dev -w frontend   # http://localhost:5173
npm run dev -w workers    # Listens on Redis
```

## 📚 Documentation

- **[API Reference](./API.md)** - Complete REST API endpoints with examples
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment (VPS, AWS ECS, Docker Compose)
- **[Production Checklist](./PRODUCTION_CHECKLIST.md)** - Pre-launch verification
- **[Setup Guide](./SETUP.md)** - Detailed setup with troubleshooting
- **[Quick Start](./QUICKSTART.md)** - 5-minute quick reference
- **[Architecture](./00-foundation/03-architecture-overview.md)** - System design and components

## 🏗️ Architecture

**Frontend Stack:**
- React 18 + TypeScript
- Vite build tool
- Zustand state management
- Axios with JWT interceptors
- Tailwind CSS styling

**Backend Stack:**
- Node.js 20+ / Express.js
- TypeScript with strict mode
- PostgreSQL + Prisma ORM
- JWT authentication (access + refresh tokens)
- Zod input validation
- Winston logging

**Background Jobs:**
- BullMQ job queue
- Redis data store
- 3 worker types: reports, images, notifications

**Infrastructure:**
- Docker containerization
- Docker Compose orchestration
- Nginx reverse proxy
- GitHub Actions CI/CD
- Multi-tenant database design

## 📊 Features Implemented

### Authentication
- ✅ User registration (creates organization + user)
- ✅ Login with JWT tokens
- ✅ Token refresh flow (15 min access, 7 day refresh)
- ✅ Multi-tenant organization isolation
- ✅ Role-based access control (ADMIN, MANAGER, INSPECTOR)

### Organizations
- ✅ Organization CRUD
- ✅ Organization statistics (users, assets, incidents)
- ✅ Multi-tenant data isolation

### Users
- ✅ User management (CRUD)
- ✅ Role assignment
- ✅ Last login tracking
- ✅ Soft deactivation

### Assets
- ✅ Asset CRUD with soft deletes
- ✅ Asset types (Communication Tower, Power Line, etc.)
- ✅ Asset location (latitude, longitude, address)
- ✅ Metadata support (height, manufacturer, etc.)
- ✅ Pagination and filtering

### Inspections
- ✅ Inspection scheduling
- ✅ Inspector assignment
- ✅ Status tracking (SCHEDULED, IN_PROGRESS, COMPLETED)
- ✅ Image upload support
- ✅ Notes and findings

### Incidents
- ✅ Incident creation and tracking
- ✅ Severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- ✅ Status workflow (OPEN, INVESTIGATING, RESOLVED, CLOSED)
- ✅ User assignment
- ✅ Comments/collaboration
- ✅ Filtering and search

### Cameras
- ✅ Camera management (create, update, delete)
- ✅ Camera types and status
- ✅ Association with assets
- ✅ Streaming URL support

### Background Workers
- ✅ Report generation queue
- ✅ Image processing queue
- ✅ Notification queue
- ✅ Job retry logic
- ✅ Event listeners

## 🔐 Security Features

- ✅ JWT authentication with separate secrets for access/refresh
- ✅ Password hashing with bcryptjs (12 rounds)
- ✅ Multi-tenant data isolation at database level
- ✅ HTTPS/TLS support
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ CORS configured for frontend domain
- ✅ Input validation with Zod schemas
- ✅ SQL injection protection (Prisma parameterized queries)
- ✅ XSS protection (React default)
- ✅ Audit logging (coming soon)

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage

# Run integration tests
npm run test -w backend -- tests/integration/

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📈 API Endpoints (27 Total)

### Authentication (4)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
```

### Organizations (3)
```
GET    /api/organizations/current
GET    /api/organizations/current/stats
PUT    /api/organizations/current
```

### Users (5)
```
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Assets (5)
```
GET    /api/assets
GET    /api/assets/:id
POST   /api/assets
PUT    /api/assets/:id
DELETE /api/assets/:id
```

### Inspections (4)
```
GET    /api/inspections
GET    /api/inspections/:id
POST   /api/inspections
PUT    /api/inspections/:id
```

### Incidents (6)
```
GET    /api/incidents
GET    /api/incidents/:id
POST   /api/incidents
PUT    /api/incidents/:id
POST   /api/incidents/:id/assign
POST   /api/incidents/:id/comments
```

Full API documentation with request/response examples: [API.md](./API.md)

## 📦 Database Schema

12 tables with proper relationships:
- **Organization** (tenant)
- **User** (with role-based access)
- **AssetType** (predefined types)
- **Asset** (infrastructure assets)
- **Camera** (monitoring cameras)
- **Inspection** (scheduled maintenance)
- **InspectionImage** (inspection photos)
- **Incident** (operational issues)
- **IncidentAssignment** (user assignments)
- **IncidentComment** (team collaboration)
- **Report** (generated reports)
- **AuditLog** (compliance tracking)

See [Database Documentation](./01-database/00-data-model-overview.md) for detailed schema.

## 🐳 Docker

Build and run with Docker:

```bash
# Development
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f backend frontend workers

# Stop services
docker-compose down
```

## 📊 Available Scripts

### Root (monorepo)
```bash
npm run dev              # Start all services in watch mode
npm run build            # Build all packages
npm run type-check       # TypeScript type checking
npm run lint             # ESLint
npm run test             # Run all tests
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed demo data
npm run db:studio        # Open Prisma Studio GUI
```

### Backend
```bash
npm run dev -w backend   # Start with hot reload
npm run build -w backend # Build TypeScript
npm run test -w backend  # Run tests
npm run lint -w backend  # Run ESLint
```

### Frontend
```bash
npm run dev -w frontend     # Start Vite dev server
npm run build -w frontend   # Build production bundle
npm run preview -w frontend # Preview production build
npm run lint -w frontend    # Run ESLint
```

### Workers
```bash
npm run dev -w workers  # Start workers
npm run build -w workers # Build TypeScript
```

## 🚀 Deployment

### Docker Compose (VPS/Self-Hosted)

```bash
# Full deployment guide in DEPLOYMENT.md

# Quick start:
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# Check status
docker-compose ps
```

### AWS ECS / Kubernetes

See [DEPLOYMENT.md](./DEPLOYMENT.md) for:
- RDS PostgreSQL setup
- ElastiCache Redis setup
- ECR image registry
- ECS task definitions
- Load balancer configuration

### GitHub Actions CI/CD

Automatic testing and deployment:
- Runs on push to main/develop
- Tests: type-check, lint, unit tests, integration tests
- Builds: Docker images for backend, frontend, workers
- Pushes to container registry (GHCR)

See [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml)

## 🛠️ Development

### Environment Variables

Copy and customize:
```bash
cp packages/backend/.env.example packages/backend/.env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Generate: `openssl rand -base64 32`
- `JWT_REFRESH_SECRET` - Generate: `openssl rand -base64 32`
- `FRONTEND_URL` - Frontend base URL
- `NODE_ENV` - development/production

## 📋 Pre-Launch Checklist

Before going to production, complete the [Production Checklist](./PRODUCTION_CHECKLIST.md):

- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Type checking clean
- [ ] Security review complete
- [ ] Database backups configured
- [ ] Monitoring/alerting setup
- [ ] SSL certificates valid
- [ ] Load testing passed
- [ ] Staging deployment verified
- [ ] Runbook procedures documented

## 📧 Support

For issues and questions:
1. Check [Troubleshooting Guide](./SETUP.md#troubleshooting)
2. Review [API Documentation](./API.md)
3. Check GitHub Issues
4. Contact: support@infrawatch.io

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Built with production-grade engineering practices:
- Multi-tenant architecture
- Service layer design
- Comprehensive validation
- Error handling at every layer
- Complete test coverage
- Security best practices
- DevOps automation
- Detailed documentation

## 📋 Project Structure

```
infrawatch/
├── packages/
│   ├── backend/          # Node.js/Express API server
│   ├── frontend/         # React web application
│   ├── workers/          # BullMQ background job workers
│   └── shared/           # Shared types and utilities
├── docs/                 # Project documentation (IEKB)
└── package.json          # Monorepo workspace configuration
```

## Architecture

### Multi-Tenant Design
Every endpoint is scoped to a tenant (organization). Tenant ID is extracted from:
1. JWT token payload (`tenantId` claim)
2. Request header (`x-tenant-id`)

### Services Layer
Clean separation between routes and business logic:
- `AuthService` - Register, login, token refresh
- `OrganizationService` - Tenant/org operations
- `UserService` - User CRUD within tenant
- `AssetService` - Asset management (towers, solar panels, etc.)
- `InspectionService` - Inspection scheduling and tracking
- `IncidentService` - Incident reporting, assignment, comments

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Redis 6+

### Installation

```bash
# Install all workspace dependencies
npm install

# Setup environment variables
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
cp packages/workers/.env.example packages/workers/.env

# Configure your environment variables in each .env file
```

### Database Setup

```bash
# Run Prisma migrations
npm run db:migrate

# (Optional) Seed database with demo data
npm run db:seed
```

### Development

```bash
# Start all services in development mode
npm run dev

# Or start individual services:
cd packages/backend && npm run dev      # API on http://localhost:3000
cd packages/frontend && npm run dev     # Frontend on http://localhost:5173
cd packages/workers && npm run dev      # Background workers
```

### Build & Production

```bash
# Build all packages
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📚 Documentation

Full project documentation is available in the [IEKB (InfraWatch Engineering Knowledge Base)](./00-foundation/00-IEKB-index.md):

- [Product Vision & Scope](./00-foundation/01-product-vision.md)
- [Architecture Overview](./00-foundation/03-architecture-overview.md)
- [Tech Stack Decisions](./00-foundation/04-tech-stack-decisions.md)
- [Development Workflow](./00-foundation/07-development-workflow.md)
- [Database Schema](./01-database/00-data-model-overview.md)
- [Authentication & Authorization](./02-auth/00-auth-overview.md)
- [API Design](./04-api/00-api-design-principles.md)

## 🏗️ Architecture

### Tech Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand
- **Workers**: BullMQ, Redis
- **Database**: PostgreSQL 14+
- **Cache/Queue**: Redis 6+
- **Deployment**: Docker, AWS (ECS/Lambda/S3/RDS)

### Core Features (V0 MVP)

- ✅ Multi-tenant architecture with complete data isolation
- ✅ User authentication (JWT) and role-based access control
- ✅ Asset management with hierarchical organization
- ✅ Camera/sensor onboarding and monitoring
- ✅ Inspection scheduling and completion workflows
- ✅ Incident reporting and management
- ✅ Background job processing (reports, notifications)
- ✅ Audit logging for compliance

### Future Enhancements (V1.1+)

- AI-powered computer vision (smoke/fire detection, PPE compliance)
- Predictive maintenance using sensor time-series
- Real-time camera streaming
- Advanced reporting and analytics
- Mobile app

## 🔒 Security

- JWT-based authentication with refresh tokens
- bcrypt password hashing
- Row-level security via tenant isolation
- CORS protection with configurable origins
- Helmet.js security headers
- Input validation with Zod schemas
- Rate limiting (to be implemented)

## 📊 Development Workflow

InfraWatch follows **trunk-based development** with short-lived feature branches:

1. Create feature branch: `git checkout -b feat/IW-XX-description`
2. Develop and commit regularly
3. Run local checks: `npm run lint && npm run type-check && npm run test`
4. Push and open Pull Request
5. Address code review feedback
6. Squash merge to `main`
7. Auto-deploy to dev environment

See [Development Workflow](./00-foundation/07-development-workflow.md) for detailed instructions.

## 🤝 Contributing

1. Check [IEKB](./00-foundation/00-IEKB-index.md) for context and standards
2. Follow [Coding Standards](./00-foundation/05-coding-standards.md)
3. Test thoroughly before submitting PR
4. Update docs if making architectural changes

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run with UI
npm run test -- --ui

# Run integration tests
npm run test -- integration
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create organization + user
- `POST /api/auth/login` - Get access + refresh tokens
- `POST /api/auth/refresh` - Refresh expired access token
- `POST /api/auth/logout` - Invalidate tokens

### Organization
- `GET /api/organizations/current` - Get organization details
- `GET /api/organizations/current/stats` - Get org stats (users, assets, incidents)
- `PUT /api/organizations/current` - Update organization

### Users
- `GET /api/users` - List users in organization
- `GET /api/users/:id` - Get user details
- `POST /api/users` - Create user (ADMIN only)
- `PUT /api/users/:id` - Update user (self or ADMIN)
- `DELETE /api/users/:id` - Deactivate user (ADMIN only)

### Assets
- `GET /api/assets` - List assets with pagination
- `GET /api/assets/:id` - Get asset details
- `POST /api/assets` - Create asset (MANAGER/ADMIN)
- `PUT /api/assets/:id` - Update asset (MANAGER/ADMIN)
- `DELETE /api/assets/:id` - Soft delete asset (MANAGER/ADMIN)

### Inspections
- `GET /api/inspections` - List inspections
- `GET /api/inspections/:id` - Get inspection details
- `POST /api/inspections` - Create inspection (MANAGER/ADMIN)
- `PUT /api/inspections/:id` - Update inspection status/notes

### Incidents
- `GET /api/incidents` - List incidents with filtering
- `GET /api/incidents/:id` - Get incident with assignments + comments
- `POST /api/incidents` - Create incident
- `PUT /api/incidents/:id` - Update incident (MANAGER/ADMIN)
- `POST /api/incidents/:id/assign` - Assign to user (MANAGER/ADMIN)
- `POST /api/incidents/:id/comments` - Add comment

## 🎯 Demo Credentials

After running `npm run db:seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@demo.local | Demo@Password123 | ADMIN |
| manager@demo.local | Demo@Password123 | MANAGER |
| inspector@demo.local | Demo@Password123 | INSPECTOR |

**Demo Data Includes:**
- Demo Tower Company organization
- 3 users with different roles
- 2 asset types (towers, solar panels)
- 3 assets with geolocation
- 2 IP cameras
- 2 scheduled inspections
- 2 incidents with assignments and comments

## 🚢 Deployment

### Docker

```bash
# Build backend container
docker build -t infrawatch-backend packages/backend

# Build frontend container
docker build -t infrawatch-frontend packages/frontend

# Run with docker-compose
docker-compose up
```

### Environment Variables

See `.env.example` files in each package for all required variables:
- Database connection strings
- JWT secrets (generate with `openssl rand -base64 32`)
- AWS credentials (for S3, SES)
- Redis connection details

## 📞 Support & Issues

- Check existing [documentation](./00-foundation/) for help
- Review [Architecture Overview](./00-foundation/03-architecture-overview.md)
- Check database schema in [Data Model](./01-database/00-data-model-overview.md)
- Review service implementations in `packages/backend/src/services/`

## 📝 License

Proprietary - InfraWatch Platform
>>>>>>> 5dd2821 (ph-01)
