# Indexing & Performance

> **IEKB Section:** 01 — Database | **Document:** 10-indexing-performance.md | **Last Updated:** 2026-07-16 | **Status:** Approved

---

## Overview

This document details the indexing strategy, query performance optimization, and database tuning for InfraWatch's PostgreSQL database.

---

## Index Strategy

### Principles

1. **Tenant-first indexing** — Every tenant-scoped query benefits from `(tenant_id, ...)` composite indexes
2. **Partial indexes for active data** — Use `WHERE deleted_at IS NULL` or `WHERE status = 'ACTIVE'` to index only relevant rows
3. **GIN indexes for JSONB** — Enable efficient metadata queries
4. **No over-indexing** — Each index has write overhead; only index columns used in WHERE, JOIN, ORDER BY
5. **Monitor with `pg_stat_user_indexes`** — Remove unused indexes quarterly

### Complete Index Catalog

| Table | Index Name | Columns | Type | Partial | Purpose |
|-------|-----------|---------|------|---------|---------|
| organizations | `idx_organizations_domain` | `(domain)` | B-tree | No | SSO domain lookup |
| organizations | `idx_organizations_is_active` | `(is_active)` | Partial B-tree | `is_active = true` | Active org filter |
| users | `idx_users_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| users | `idx_users_tenant_id_role` | `(tenant_id, role)` | B-tree | No | Role-based filtering |
| users | `idx_users_email` | `(email)` | B-tree | No | Login lookup |
| asset_types | `idx_asset_types_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| assets | `idx_assets_tenant_id` | `(tenant_id)` | B-tree | No | Basic tenant query |
| assets | `idx_assets_tenant_id_status` | `(tenant_id, status)` | Partial B-tree | `deleted_at IS NULL` | Active asset filtering |
| assets | `idx_assets_tenant_id_asset_type_id` | `(tenant_id, asset_type_id)` | B-tree | No | Type-based filtering |
| assets | `idx_assets_tenant_id_name` | `(tenant_id, name)` | B-tree | No | Name search/sort |
| assets | `idx_assets_metadata` | `(metadata)` | GIN | No | JSONB queries |
| cameras | `idx_cameras_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| cameras | `idx_cameras_tenant_id_asset_id` | `(tenant_id, asset_id)` | B-tree | No | Cameras per asset |
| cameras | `idx_cameras_tenant_id_status` | `(tenant_id, status)` | B-tree | No | Status filtering |
| inspections | `idx_inspections_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| inspections | `idx_inspections_tenant_id_status` | `(tenant_id, status)` | B-tree | No | Status filtering |
| inspections | `idx_inspections_tenant_id_asset_id` | `(tenant_id, asset_id)` | B-tree | No | Inspections per asset |
| inspections | `idx_inspections_tenant_id_inspector_id` | `(tenant_id, inspector_id)` | B-tree | No | Inspector workload |
| inspections | `idx_inspections_scheduled_date` | `(scheduled_date)` | B-tree | No | Calendar/date queries |
| inspection_images | `idx_inspection_images_inspection_id` | `(inspection_id)` | B-tree | No | Images per inspection |
| incidents | `idx_incidents_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| incidents | `idx_incidents_tenant_id_status` | `(tenant_id, status)` | Partial B-tree | `deleted_at IS NULL` | Active incident filtering |
| incidents | `idx_incidents_tenant_id_severity` | `(tenant_id, severity)` | Partial B-tree | `deleted_at IS NULL` | Severity-based filtering |
| incidents | `idx_incidents_tenant_id_asset_id` | `(tenant_id, asset_id)` | B-tree | No | Incidents per asset |
| incidents | `idx_incidents_tenant_id_assigned_to_id` | `(tenant_id, assigned_to_id)` | B-tree | No | Assignment queries |
| incident_comments | `idx_incident_comments_incident_id` | `(incident_id)` | B-tree | No | Comments per incident |
| incident_attachments | `idx_incident_attachments_incident_id` | `(incident_id)` | B-tree | No | Attachments per incident |
| reports | `idx_reports_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| reports | `idx_reports_tenant_id_status` | `(tenant_id, status)` | B-tree | No | Status filtering |
| audit_logs | `idx_audit_logs_tenant_id` | `(tenant_id)` | B-tree | No | Tenant-scoped queries |
| audit_logs | `idx_audit_logs_tenant_id_entity` | `(tenant_id, entity_type, entity_id)` | B-tree | No | Entity history lookup |
| audit_logs | `idx_audit_logs_tenant_id_created_at` | `(tenant_id, created_at DESC)` | B-tree | No | Chronological audit trail |
| audit_logs | `idx_audit_logs_tenant_id_user_id` | `(tenant_id, user_id)` | B-tree | No | User activity audit |
| refresh_tokens | `idx_refresh_tokens_user_id` | `(user_id)` | B-tree | No | User token lookup |
| refresh_tokens | `idx_refresh_tokens_token_hash` | `(token_hash)` | B-tree | No | Token verification |
| refresh_tokens | `idx_refresh_tokens_expires_at` | `(expires_at)` | Partial B-tree | `revoked_at IS NULL` | Active token cleanup |

---

## Query Performance Analysis

### EXPLAIN ANALYZE Examples

#### Asset List Query (Most Common)

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT a.*, at.name AS type_name
FROM assets a
LEFT JOIN asset_types at ON at.id = a.asset_type_id
WHERE a.tenant_id = 1
  AND a.deleted_at IS NULL
  AND a.status = 'ACTIVE'
ORDER BY a.created_at DESC
LIMIT 20 OFFSET 0;
```

**Expected Plan:**
```
Limit (cost=0.43..12.56 rows=20)
  -> Index Scan using idx_assets_tenant_id_status on assets a
     Index Cond: (tenant_id = 1 AND status = 'ACTIVE')
     Filter: (deleted_at IS NULL)
  -> Index Scan using asset_types_pkey on asset_types at
     Index Cond: (id = a.asset_type_id)
```

**Target:** < 5ms for 10,000 assets per tenant.

#### Incident Dashboard Aggregation

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT severity, status, COUNT(*)
FROM incidents
WHERE tenant_id = 1 AND deleted_at IS NULL
GROUP BY severity, status;
```

**Expected:** Index-only scan on `idx_incidents_tenant_id_status`, < 10ms.

---

## Performance Monitoring

### Key Queries to Monitor

```sql
-- Top 10 slowest queries
SELECT
  calls,
  ROUND(total_exec_time::numeric, 2) AS total_ms,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(max_exec_time::numeric, 2) AS max_ms,
  LEFT(query, 200) AS query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

```sql
-- Unused indexes (candidates for removal)
SELECT
  schemaname, relname AS table_name, indexrelname AS index_name,
  idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelname NOT LIKE 'uq_%'
  AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;
```

```sql
-- Table sizes and row counts
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(oid)) AS total_size,
  pg_size_pretty(pg_relation_size(oid)) AS data_size,
  pg_size_pretty(pg_indexes_size(oid)) AS index_size,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(oid) DESC;
```

---

## Connection Pooling

### Prisma Connection Pool

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Connection pool settings via URL:
  // ?connection_limit=20&pool_timeout=10
}
```

### Pool Sizing Guidelines

| Environment | API Pods | Pool per Pod | Total Connections | RDS Max |
|------------|---------|-------------|-------------------|---------|
| Dev | 1 | 10 | 10 | 100 |
| Staging | 2 | 15 | 30 | 100 |
| Production | 5 | 20 | 100 | 200 |
| Production (scale) | 10 | 15 | 150 | 200 |

**Formula:** `pool_per_pod = max_connections / (api_pods + worker_pods + buffer)`

---

## Partitioning Strategy (Future)

For tables exceeding 10M rows, consider range partitioning:

### Audit Logs (Candidate for Partitioning)

```sql
-- Partition by month for efficient data lifecycle management
CREATE TABLE audit_logs (
    id          BIGSERIAL,
    tenant_id   INTEGER NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- ... other columns
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2026_07 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE audit_logs_2026_08 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
```

**Benefits:**
- Drop old partitions instead of DELETE (instant, no vacuum needed)
- Queries on recent data only scan relevant partitions
- Backup/archive old partitions independently

**When to Partition:**
- Audit logs > 5M rows (typically after 6-12 months of production use)
- Not needed for V0 launch

---

## PostgreSQL Configuration

### Performance-Relevant Settings

```ini
# Memory
shared_buffers = 4GB                 # 25% of server RAM
effective_cache_size = 12GB          # 75% of server RAM
work_mem = 64MB                      # Per-query memory for sorts/hashes
maintenance_work_mem = 1GB           # For VACUUM, CREATE INDEX

# WAL
wal_buffers = 64MB
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 4GB

# Query Planner
random_page_cost = 1.1               # SSD-optimized (default 4.0)
effective_io_concurrency = 200       # SSD-optimized (default 1)
default_statistics_target = 200      # More accurate query planning

# Logging
log_min_duration_statement = 200     # Log queries slower than 200ms
log_statement = 'ddl'                # Log all schema changes
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0                   # Log all temp file usage

# Connections
max_connections = 200
```

---

## Related Documents

- **Previous:** [Incident Table](./09-incident-table.md) | **Next:** [Seed Data](./11-seed-data.md)
- **Observability:** [Metrics Guide](../09-observability/02-metrics-guide.md) — Database metrics dashboards
- **Scaling:** [Scaling Runbook](../14-runbooks/04-scaling-runbook.md) — DB scaling procedures
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
