# InfraWatch - Launch Guide

Complete step-by-step guide from development to production for live deployment.

## Phase 1: Final Verification (Day -1)

### 1. Code Quality Check

```bash
# Verify all code quality standards
npm run type-check        # Should pass with 0 errors
npm run lint              # Should pass with 0 errors  
npm run test              # All tests should pass

# Output check:
# ✅ No TypeScript errors
# ✅ No ESLint issues
# ✅ All unit tests passing
# ✅ All integration tests passing
```

**Sign-off**: If all checks pass, proceed. If any fail, fix before continuing.

### 2. Database Verification

```bash
# Verify migrations work from scratch
docker-compose -f docker-compose.dev.yml down -v  # Clean slate
docker-compose -f docker-compose.dev.yml up -d    # Start fresh

# Wait 30 seconds for DB to be ready
sleep 30

# Run migrations
npm run db:migrate --prefix packages/backend

# Verify tables exist
npm run db:studio --prefix packages/backend  # GUI should show all 12 tables

# Seed demo data
npm run db:seed --prefix packages/backend

# Verify seed data
# Should see: 1 org, 3 users, 2 asset types, 3 assets, 2 cameras, 2 inspections, 2 incidents
```

### 3. API Endpoint Verification

```bash
# Terminal 1: Start backend
npm run dev -w backend

# Wait for "Server listening on http://localhost:3000"

# Terminal 2: Test all endpoints
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"Demo@Password123"}'

# Copy accessToken from response
export TOKEN="<paste-accessToken-here>"

# Test key endpoints
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/organizations/current
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/organizations/current/stats
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/assets
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/incidents

# ✅ All should return 200 OK with data
```

### 4. Frontend Verification

```bash
# Terminal 3: Start frontend
npm run dev -w frontend

# Browser: http://localhost:5173
# ✅ Login page displays
# ✅ Login with: admin@demo.local / Demo@Password123
# ✅ Dashboard shows org stats
# ✅ Can view assets, incidents in listings
# ✅ No console errors
```

### 5. Security Review

```bash
# Check for hardcoded secrets
grep -r "password\|secret\|api.key" --include="*.ts" --include="*.tsx" \
  packages/backend packages/frontend | grep -v .env.example | grep -v node_modules

# Should return: NOTHING (or only comments)

# Check .env is in gitignore
cat .gitignore | grep ".env"

# Should include: .env (but not .env.example)
```

## Phase 2: Staging Deployment (Day 0)

### 1. Create Staging Environment

Choose your deployment target:

**Option A: Docker Compose (VPS)**
```bash
# SSH into staging server
ssh user@staging.infrawatch.example.com

# Clone repo
git clone https://github.com/yourorg/infrawatch.git
cd infrawatch

# Create .env for staging
cat > packages/backend/.env << 'EOF'
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://infrawatch:STRONG_PASSWORD@db:5432/infrawatch_staging
REDIS_URL=redis://redis:6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=https://staging.infrawatch.example.com
FRONTEND_API_URL=https://api-staging.infrawatch.example.com
LOG_LEVEL=info
EOF

# Start services
docker-compose -f docker-compose.dev.yml up -d

# Wait for database
sleep 30

# Run migrations
docker-compose exec backend npm run db:migrate

# Seed data
docker-compose exec backend npm run db:seed

# Verify
docker-compose logs -f backend | head -20
```

**Option B: AWS ECS**
- Follow [DEPLOYMENT.md](./DEPLOYMENT.md) AWS ECS section
- Create RDS PostgreSQL instance
- Create ElastiCache Redis cluster
- Push images to ECR
- Create ECS task definitions

### 2. Smoke Tests on Staging

```bash
# 1. Health Check
curl https://api-staging.infrawatch.example.com/health

# 2. Login Test
curl -X POST https://api-staging.infrawatch.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.local",
    "password": "Demo@Password123"
  }'

# 3. API Test
TOKEN="<paste-token-from-login>"
curl -H "Authorization: Bearer $TOKEN" \
  https://api-staging.infrawatch.example.com/api/organizations/current

# 4. UI Test
# Open https://staging.infrawatch.example.com in browser
# Login, verify dashboard loads
# Create a test incident to verify full flow
```

### 3. QA Testing Checklist (Staging)

- [ ] User can register new organization
- [ ] User can login
- [ ] Dashboard displays stats correctly
- [ ] Can create asset
- [ ] Can create incident
- [ ] Can add incident comment
- [ ] Can filter incidents by status/severity
- [ ] Token refresh works (test after 15 min)
- [ ] Can logout
- [ ] Role-based access works (test as different roles)
- [ ] Error messages display correctly
- [ ] API rate limiting works
- [ ] Database backups running
- [ ] Logs are being collected
- [ ] Monitoring alerts are configured

### 4. Performance Testing (Staging)

```bash
# Load test: 100 concurrent users
npm install -g artillery

cat > load-test.yml << 'EOF'
config:
  target: "https://api-staging.infrawatch.example.com"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 100
      name: "Ramp up"

scenarios:
  - name: "Standard user flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@demo.local"
            password: "Demo@Password123"
          capture:
            json: "$.accessToken"
            as: "token"
      - get:
          url: "/api/organizations/current"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/assets"
          headers:
            Authorization: "Bearer {{ token }}"
EOF

artillery run load-test.yml

# Check metrics:
# - p95 latency: should be < 500ms
# - p99 latency: should be < 1000ms
# - Error rate: should be < 1%
```

### 5. 24-Hour Stability Test (Staging)

```bash
# Let staging run for 24 hours and monitor:
# - Error logs (should be < 1 per hour)
# - Memory usage (should be stable, not growing)
# - Database connections (should be stable)
# - No unhandled exceptions

# Daily checks:
docker-compose logs backend | grep ERROR | wc -l
docker stats  # Check memory, CPU
```

## Phase 3: Production Deployment (Day 1)

### Pre-Deployment Checklist

- [ ] All staging tests passed
- [ ] Database backup created
- [ ] Rollback procedure documented
- [ ] Team notified
- [ ] Support team on standby
- [ ] Monitoring/alerting configured
- [ ] SSL certificates installed and valid
- [ ] DNS configured and tested

### 1. Create Production Environment

```bash
# SSH into production server
ssh user@production.infrawatch.example.com

# Clone release branch
git clone -b main https://github.com/yourorg/infrawatch.git
cd infrawatch

# Create production .env
cat > packages/backend/.env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://infrawatch:STRONG_PASSWORD@db:5432/infrawatch_prod
REDIS_URL=redis://redis:6379
JWT_SECRET=<GENERATE-RANDOM>
JWT_REFRESH_SECRET=<GENERATE-RANDOM>
FRONTEND_URL=https://infrawatch.yourcompany.com
FRONTEND_API_URL=https://api.infrawatch.yourcompany.com
LOG_LEVEL=warn
EOF

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services
sleep 60

# Check all services running
docker-compose ps

# Should show:
# ✅ backend (healthy)
# ✅ frontend (healthy)
# ✅ workers (running)
# ✅ postgres (healthy)
# ✅ redis (healthy)
```

### 2. Initialize Production Database

```bash
# Run migrations (creates schema)
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Create first admin user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "STRONG_PRODUCTION_PASSWORD",
    "name": "Admin User",
    "organizationName": "Your Company"
  }'

# Verify database
docker-compose -f docker-compose.prod.yml exec postgres psql -U infrawatch -d infrawatch_prod -c "\dt"

# Should show all 12 tables
```

### 3. Configure Nginx/SSL

```bash
# Install SSL certificate
sudo certbot certonly --standalone \
  -d infrawatch.yourcompany.com \
  -d api.infrawatch.yourcompany.com

# Update Nginx config with cert paths
sudo nano /etc/nginx/sites-available/infrawatch

# Restart Nginx
sudo systemctl restart nginx

# Verify HTTPS
curl https://infrawatch.yourcompany.com/
curl https://api.infrawatch.yourcompany.com/health
```

### 4. Post-Deployment Verification

```bash
# 1. Health Checks
curl https://api.infrawatch.yourcompany.com/health
curl https://infrawatch.yourcompany.com/

# 2. Login Test
curl -X POST https://api.infrawatch.yourcompany.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourcompany.com","password":"PASSWORD"}'

# 3. Create test data
TOKEN="<from-login-response>"
curl -X POST https://api.infrawatch.yourcompany.com/api/incidents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Production deployment test",
    "description": "Testing incident creation",
    "severity": "LOW"
  }'

# 4. UI Test
# Open https://infrawatch.yourcompany.com
# Login with admin credentials
# Verify dashboard loads
```

## Phase 4: Go-Live (Hour 1)

### Monitoring

```bash
# Monitor key metrics every 5 minutes:
# - API error rate (should be < 1%)
# - Average response time (should be < 500ms)
# - Database connections (should be stable)
# - Redis memory (should be < 80%)
# - Server CPU (should be < 60%)
# - Server memory (should be < 70%)

# Check logs for errors:
docker-compose -f docker-compose.prod.yml logs --tail 100 backend | grep ERROR

# Expected: ZERO errors in first hour
```

### Communication

- [ ] Post to status page: "InfraWatch is now LIVE"
- [ ] Announce to team
- [ ] Send launch email to early adopters
- [ ] Monitor support channels

## Phase 5: Post-Launch (Week 1)

### Daily Monitoring

- [ ] Review error logs (should be < 10 per day)
- [ ] Check performance metrics (latency < 500ms p95)
- [ ] Verify database backups completed
- [ ] Monitor disk usage
- [ ] Check SSL certificate expiration
- [ ] Review user feedback

### First Week Tasks

- [ ] Day 1: Verify all core features working
- [ ] Day 2: Onboard first 5 organizations
- [ ] Day 3: Get customer feedback
- [ ] Day 4: Monitor usage patterns
- [ ] Day 5: Performance optimization if needed
- [ ] Day 7: Review and document lessons learned

## Rollback Procedure (If Needed)

If critical issues occur in first 48 hours:

```bash
# 1. Stop current deployment
docker-compose -f docker-compose.prod.yml down

# 2. Restore database backup
gunzip < backup/infrawatch_20240115_020000.sql.gz | \
  docker exec -i infrawatch-postgres psql -U infrawatch infrawatch_prod

# 3. Start previous version
git checkout previous-tag
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify rollback
curl https://api.infrawatch.yourcompany.com/health
```

**Rollback window**: 48 hours (keep old containers running)

## Success Criteria

Launch is successful when:

- ✅ All 27 API endpoints responding correctly
- ✅ Login/authentication working
- ✅ Dashboard displaying data
- ✅ Can create incidents and assets
- ✅ Error rate < 1%
- ✅ API latency < 500ms (p95)
- ✅ Database backups running
- ✅ Monitoring alerts configured
- ✅ Zero unhandled exceptions
- ✅ Users can complete full workflows

## Troubleshooting

See [SETUP.md - Troubleshooting](./SETUP.md#troubleshooting) for common issues.

### Emergency Contacts

- Platform Lead: [contact]
- DevOps Lead: [contact]
- Database Admin: [contact]
- Support Lead: [contact]

## Documentation Links

- [Deployment Guide](./DEPLOYMENT.md)
- [API Reference](./API.md)
- [Architecture Overview](./00-foundation/03-architecture-overview.md)
- [Production Checklist](./PRODUCTION_CHECKLIST.md)
- [Setup Guide](./SETUP.md)

---

## Timeline Summary

| Phase | Duration | Start | End | Status |
|-------|----------|-------|-----|--------|
| Final Verification | 4 hours | Day -1 | Day -1 | ⏳ Pending |
| Staging Deployment | 1 day | Day 0 | Day 0 | ⏳ Pending |
| QA Testing | 1 day | Day 0 | Day 0 | ⏳ Pending |
| Stability Testing | 24 hours | Day 0 | Day 1 | ⏳ Pending |
| Production Deployment | 2 hours | Day 1 08:00 | Day 1 10:00 | ⏳ Pending |
| Go-Live Monitoring | 4 hours | Day 1 10:00 | Day 1 14:00 | ⏳ Pending |
| Post-Launch (Week 1) | 7 days | Day 1 | Day 7 | ⏳ Pending |

---

**Ready to launch? Follow this guide step-by-step for safe, verified production deployment.**

Last updated: 2024-01-15
