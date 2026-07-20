# InfraWatch - Production Ready Checklist

Complete verification checklist before shipping to production.

## Code Quality

- [ ] All TypeScript files compile without errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] All tests pass (`npm run test`)
- [ ] Code coverage > 80% for critical paths
- [ ] No hardcoded secrets or sensitive data
- [ ] Error messages don't leak internal implementation details
- [ ] All required environment variables documented in `.env.example`

## Backend API

- [ ] All 27 endpoints implemented and tested
- [ ] JWT authentication working (access + refresh tokens)
- [ ] Multi-tenant isolation enforced at service level
- [ ] Request validation on all inputs (Zod schemas)
- [ ] Error responses consistent format with proper HTTP status codes
- [ ] Rate limiting configured (if needed)
- [ ] CORS configured for frontend domain only
- [ ] Request logging enabled (Winston)
- [ ] Middleware pipeline in correct order:
  - [ ] Request logger
  - [ ] Tenant context
  - [ ] Auth middleware (where needed)
  - [ ] Validation middleware
  - [ ] Business logic
  - [ ] Error handler
- [ ] Database migrations up to date
- [ ] Database indexes optimized for common queries
- [ ] Connection pooling configured (Prisma)
- [ ] Soft deletes working correctly

## Frontend

- [ ] Login page functional with demo credentials
- [ ] Register page creates org and user
- [ ] Dashboard displays org stats correctly
- [ ] Protected routes require authentication
- [ ] Token refresh interceptor works (test by waiting 15 min)
- [ ] Logout clears auth state and redirects to login
- [ ] No sensitive data in localStorage (except tokens)
- [ ] API errors display user-friendly messages
- [ ] Responsive design works on mobile/tablet
- [ ] Browser console has no errors/warnings
- [ ] Build succeeds without warnings (`npm run build`)
- [ ] Production build is < 200KB (gzipped)

## Database

- [ ] PostgreSQL is v14+
- [ ] All tables created with correct schemas
- [ ] Multi-tenant columns (tenant_id) on all relevant tables
- [ ] Indexes created for performance queries
- [ ] Foreign keys set up with proper constraints
- [ ] Soft delete timestamps working (deletedAt)
- [ ] Seed data loads successfully
- [ ] Migration history is clean
- [ ] Connection limits appropriate for deployment

## Workers (BullMQ)

- [ ] Redis is running and accessible
- [ ] Report generation queue initialized
- [ ] Image processing queue initialized
- [ ] Notification queue initialized
- [ ] Worker processes start without errors
- [ ] Job failure handling works
- [ ] Job retry logic configured
- [ ] Event listeners working (progress, completion)

## Security

- [ ] JWT secrets are strong (32+ chars, random)
- [ ] Database password is strong (16+ chars, mixed case)
- [ ] HTTPS configured (SSL certificate valid)
- [ ] Security headers enabled (Strict-Transport-Security, X-Frame-Options, etc.)
- [ ] CORS doesn't allow *
- [ ] Passwords hashed with bcrypt (12+ rounds)
- [ ] No plaintext passwords in logs
- [ ] SQL injection protected (using Prisma/parameterized queries)
- [ ] XSS protected (React escapes by default)
- [ ] CSRF token not needed (JWT-based, stateless)
- [ ] Password reset flow secure (if implemented)
- [ ] Session management uses secure cookies (if applicable)

## DevOps & Deployment

- [ ] Dockerfiles build successfully
- [ ] Docker Compose files configured for production
- [ ] Environment variables loaded from .env files
- [ ] Health checks configured for all containers
- [ ] Restart policies set (unless-stopped)
- [ ] Volume mounts don't expose sensitive files
- [ ] Container resource limits set (memory, CPU)
- [ ] Logging configured (stdout/stderr to Docker logs)
- [ ] Database backups automated
- [ ] Database backup encryption enabled
- [ ] Monitoring/alerting configured
- [ ] CI/CD pipeline configured (GitHub Actions)
- [ ] Deployment script tested

## Monitoring & Observability

- [ ] Logger configured (Winston or similar)
- [ ] Log levels: debug, info, warn, error
- [ ] Critical business events logged
- [ ] Performance metrics tracked (request times)
- [ ] Error rates monitored
- [ ] Health check endpoint working
- [ ] Database connection pool monitored
- [ ] Redis memory usage monitored
- [ ] Alerts configured for:
  - [ ] High error rate (> 5%)
  - [ ] High latency (> 1s)
  - [ ] Service unavailability
  - [ ] Low disk space
  - [ ] Database connection pool near limit

## Documentation

- [ ] README.md complete with quick start
- [ ] API.md has all endpoints documented with examples
- [ ] DEPLOYMENT.md covers staging and production
- [ ] SETUP.md has troubleshooting section
- [ ] Code comments explain complex logic
- [ ] Architecture documented (00-foundation folder)
- [ ] Database schema documented
- [ ] Environment variables documented in .env.example

## Testing

- [ ] Unit tests for critical services (auth, user, asset)
- [ ] Integration tests for complete workflows
- [ ] E2E tests for user flows (register → login → create incident)
- [ ] Error case tests (401, 404, 400, etc.)
- [ ] Tenant isolation tests
- [ ] Load testing done (expected traffic volume)
- [ ] Security testing done (OWASP top 10)

## Staging Environment

- [ ] Code deployed to staging
- [ ] All tests pass in staging
- [ ] Manual QA performed:
  - [ ] Register new org
  - [ ] Login with credentials
  - [ ] Create assets
  - [ ] Create incidents
  - [ ] Add incident comments
  - [ ] Test role-based access (try accessing as different roles)
- [ ] Performance acceptable (< 1s API latency)
- [ ] Load testing passed (expected concurrent users)
- [ ] No memory leaks (test 24 hours)

## Rollback Plan

- [ ] Previous version tagged in git
- [ ] Database backup exists
- [ ] Rollback procedure documented
- [ ] Tested rollback procedure in staging
- [ ] Communication plan for incidents

## Day 1 Production

- [ ] Application deployed and running
- [ ] Health checks passing
- [ ] First 10 organizations created successfully
- [ ] User login/logout working
- [ ] API endpoints responding < 1s
- [ ] No error rate spike
- [ ] Backup jobs running
- [ ] Logs being collected
- [ ] Alerts enabled

## Post-Launch Monitoring (Week 1)

- [ ] Daily review of error logs
- [ ] Daily check of system performance
- [ ] User feedback collected and triaged
- [ ] Critical bugs fixed immediately
- [ ] Database backup verification
- [ ] Security event monitoring
- [ ] Uptime > 99.9%

## Sign-Off

**Code Review:**
- [ ] Pull request reviewed by: ________________
- [ ] Date: ________________

**QA Sign-Off:**
- [ ] All tests passed by: ________________
- [ ] Date: ________________

**Deployment Authorization:**
- [ ] Approved by: ________________
- [ ] Date: ________________

**Deployment Completed:**
- [ ] Deployed to production by: ________________
- [ ] Date/Time: ________________
- [ ] Version: ________________
- [ ] Rollback plan active until: ________________ (48 hours)

## Notes

```
Use this space to document any issues, workarounds, or important notes:




```

---

## Quick Checks Before Hitting Deploy Button

1. **Secrets**: Run `grep -r "password\|secret\|key" --include="*.ts" --include="*.tsx" --include="*.js"` - should only find .env.example
2. **Build**: `npm run build` succeeds without warnings
3. **Tests**: `npm run test` passes (all suites)
4. **Lint**: `npm run lint` has zero errors (warnings ok)
5. **Types**: `npm run type-check` has zero errors
6. **Endpoints**: 27 API endpoints implemented
7. **Auth**: JWT tokens working (test manually)
8. **Database**: Migrations applied and tested
9. **Workers**: BullMQ queues initialized
10. **Docker**: All images build successfully

If ANY of the above fails, **DO NOT DEPLOY**. Fix issues and re-verify.
