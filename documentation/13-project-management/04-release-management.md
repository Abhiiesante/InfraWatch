# Release Management

> **IEKB Section:** 14 — Project Management  
> **Document:** 04-release-management.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Engineering Manager  
> **Status:** Approved

---

## Table of Contents

1. [Continuous Deployment (CD)](#continuous-deployment-cd)
2. [Feature Toggles](#feature-toggles)
3. [Database Migration Safety](#database-migration-safety)
4. [Related Documents](#related-documents)

---

## Continuous Deployment (CD)

Because we use Trunk-Based Development, there is no "Release Day". Merges to the `main` branch are automatically deployed to production via GitHub Actions.

This requires extremely high confidence in our automated test suite. If the CI tests pass, the code goes live.

---

## Feature Toggles

To decouple "deploying code" from "releasing features," we use Feature Toggles (e.g., using LaunchDarkly or a custom PostgreSQL table).

If a developer is working on a massive new feature (like Predictive Maintenance) that spans multiple sprints, they do not keep a stale branch sitting around for 4 weeks. They merge their code into `main` daily, but wrap the new UI routes and API endpoints in a Feature Toggle:

```typescript
if (await featureFlags.isEnabled(req.tenantId, 'PREDICTIVE_MAINTENANCE')) {
  // Execute new code
} else {
  // Throw 404 or execute old code
}
```

When the feature is ready for QA, the toggle is turned on only for the internal `infrawatch` tenant in production. Once verified, it is toggled on globally.

---

## Database Migration Safety

Because deployments happen automatically, database migrations must be carefully managed to avoid downtime.

**The Golden Rule:** Migrations must always be backwards compatible with the *current* running code.
- ❌ **Bad:** Renaming a column in one PR. The currently running old code will instantly crash because it expects the old column name.
- ✅ **Good (3-Step Release):** 
  1. Add new column.
  2. Deploy code that writes to BOTH columns but reads from old.
  3. Deploy code that reads from NEW. 
  4. Drop old column.

---

## Related Documents

- **DevOps:** [GitHub Actions Deploy](../08-devops/10-github-actions-deploy.md)
- **DevOps:** [Database Migrations CI](../08-devops/11-database-migrations-ci.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
