# Audit Logging

> **IEKB Section:** 11 — Security  
> **Document:** 06-audit-logging.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [System Level (AWS CloudTrail)](#system-level-aws-cloudtrail)
2. [Application Level (Security Events)](#application-level-security-events)
3. [Retention Policy](#retention-policy)
4. [Related Documents](#related-documents)

---

## System Level (AWS CloudTrail)

AWS CloudTrail is enabled by default across all regions. It records every API call made against our AWS infrastructure (e.g., who deleted the S3 bucket, who changed the Security Group).

These logs are delivered to a dedicated, heavily restricted S3 bucket in a central "Security & Audit" AWS Account (separated via AWS Organizations from the Production account).

---

## Application Level (Security Events)

Within the Node.js application, standard request logging (via Pino) is not sufficient for compliance audits. We must explicitly log security-critical lifecycle events.

We use a dedicated `auditLogger` instance that is configured to always write to `stdout` (which CloudWatch ingests) even if standard application logging is turned down to `error` level.

Events that MUST generate an audit log:
1. **Authentication:** Successful logins, failed logins, password resets, token refreshes.
2. **Authorization:** Changes to user roles (e.g., upgrading a user to MANAGER).
3. **Data Integrity:** Hard deletions of any database record.

```typescript
// Example usage in Auth Controller
import { auditLogger } from '@/utils/auditLogger';

if (!isValidPassword) {
  auditLogger.info({
    event: 'AUTH_LOGIN_FAILED',
    email: req.body.email,
    ip: req.ip,
    reason: 'Invalid Credentials'
  }, 'Failed login attempt');
  throw new AppError(401, 'Invalid credentials');
}

auditLogger.info({
  event: 'AUTH_LOGIN_SUCCESS',
  userId: user.id,
  tenantId: user.tenantId,
  ip: req.ip
}, 'Successful login');
```

---

## Retention Policy

- **Application Logs (CloudWatch):** Retained for 30 days, then automatically deleted to save costs.
- **Audit Logs (CloudWatch Metric Filters & S3):** Audit logs are filtered from CloudWatch and continuously archived to Amazon S3 Glacier (Cold Storage) where they are retained immutably for 7 years to meet standard compliance requirements.

---

## Related Documents

- **Logging:** [Structured Logging Guide](../09-observability/01-structured-logging.md)
- **Architecture:** [Security Overview](./00-security-overview.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

