# Migration V001 — Baseline Schema

> **IEKB Section:** 01 — Database  
> **Document:** 02-migration-V001-baseline.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Database Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [Prerequisites](#prerequisites)
3. [Complete Baseline SQL](#complete-baseline-sql)
4. [Prisma Schema](#prisma-schema)
5. [Row-Level Security Policies](#row-level-security-policies)
6. [Verification Queries](#verification-queries)
7. [Related Documents](#related-documents)

---

## Migration Overview

| Property | Value |
|----------|-------|
| **Migration Name** | `20260716000000_init` |
| **Description** | Creates all V0 tables, indexes, constraints, and RLS policies |
| **Tables Created** | 12 |
| **Indexes Created** | 22 |
| **Constraints** | 18 foreign keys, 8 check constraints, 4 unique constraints |
| **Estimated Duration** | < 5 seconds on empty database |

---

## Prerequisites

```sql
-- Ensure PostgreSQL 16+ is running
SELECT version();

-- Create database (if not using Prisma's createDatabase)
CREATE DATABASE infrawatch;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Complete Baseline SQL

```sql
-- ============================================================================
-- InfraWatch V0 — Baseline Migration
-- Migration: 20260716000000_init
-- Description: Creates all core V0 tables, indexes, and constraints
-- ============================================================================

-- ============================================================================
-- 1. ORGANIZATIONS (Tenants)
-- ============================================================================
CREATE TABLE "organizations" (
    "id"          SERIAL       PRIMARY KEY,
    "name"        VARCHAR(255) NOT NULL,
    "domain"      VARCHAR(255) UNIQUE,
    "plan"        VARCHAR(50)  NOT NULL DEFAULT 'STARTER',
    "logo_url"    TEXT,
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_organizations_valid_plan"
        CHECK ("plan" IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE'))
);

CREATE INDEX "idx_organizations_domain" ON "organizations" ("domain");
CREATE INDEX "idx_organizations_is_active" ON "organizations" ("is_active") WHERE "is_active" = true;

COMMENT ON TABLE "organizations" IS 'Multi-tenant organizations (companies). Each org is a tenant boundary.';
COMMENT ON COLUMN "organizations"."domain" IS 'Unique domain for the organization (e.g., towernet.com). Used for SSO and branding.';
COMMENT ON COLUMN "organizations"."plan" IS 'Subscription plan: STARTER, PROFESSIONAL, ENTERPRISE.';

-- ============================================================================
-- 2. USERS
-- ============================================================================
CREATE TABLE "users" (
    "id"              SERIAL       PRIMARY KEY,
    "tenant_id"       INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "name"            VARCHAR(255) NOT NULL,
    "email"           VARCHAR(320) NOT NULL,
    "hashed_password" TEXT         NOT NULL,
    "role"            VARCHAR(20)  NOT NULL DEFAULT 'INSPECTOR',
    "avatar_url"      TEXT,
    "phone"           VARCHAR(20),
    "is_active"       BOOLEAN      NOT NULL DEFAULT true,
    "last_login_at"   TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_users_tenant_id_email" UNIQUE ("tenant_id", "email"),
    CONSTRAINT "ck_users_valid_role"
        CHECK ("role" IN ('ADMIN', 'MANAGER', 'INSPECTOR'))
);

CREATE INDEX "idx_users_tenant_id" ON "users" ("tenant_id");
CREATE INDEX "idx_users_tenant_id_role" ON "users" ("tenant_id", "role");
CREATE INDEX "idx_users_email" ON "users" ("email");

COMMENT ON TABLE "users" IS 'Application users. Scoped to a tenant (organization). Email is unique within a tenant.';
COMMENT ON COLUMN "users"."role" IS 'ADMIN: full access. MANAGER: manage assets, inspections, incidents. INSPECTOR: field work, reporting.';

-- ============================================================================
-- 3. ASSET TYPES
-- ============================================================================
CREATE TABLE "asset_types" (
    "id"          SERIAL       PRIMARY KEY,
    "tenant_id"   INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "name"        VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon"        VARCHAR(50),
    "is_active"   BOOLEAN      NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "uq_asset_types_tenant_id_name" UNIQUE ("tenant_id", "name")
);

CREATE INDEX "idx_asset_types_tenant_id" ON "asset_types" ("tenant_id");

COMMENT ON TABLE "asset_types" IS 'Configurable asset categories per tenant (e.g., Tower, Solar Panel, Pump Station).';

-- ============================================================================
-- 4. ASSETS
-- ============================================================================
CREATE TABLE "assets" (
    "id"             SERIAL         PRIMARY KEY,
    "tenant_id"      INTEGER        NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "asset_type_id"  INTEGER        REFERENCES "asset_types"("id") ON DELETE SET NULL,
    "created_by_id"  INTEGER        REFERENCES "users"("id") ON DELETE SET NULL,
    "name"           VARCHAR(255)   NOT NULL,
    "description"    TEXT,
    "latitude"       DECIMAL(10, 7),
    "longitude"      DECIMAL(10, 7),
    "address"        TEXT,
    "metadata"       JSONB          DEFAULT '{}',
    "status"         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    "deleted_at"     TIMESTAMPTZ,
    "created_at"     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_assets_valid_status"
        CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DECOMMISSIONED')),
    CONSTRAINT "ck_assets_valid_latitude"
        CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
    CONSTRAINT "ck_assets_valid_longitude"
        CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
);

CREATE INDEX "idx_assets_tenant_id" ON "assets" ("tenant_id");
CREATE INDEX "idx_assets_tenant_id_status" ON "assets" ("tenant_id", "status") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_assets_tenant_id_asset_type_id" ON "assets" ("tenant_id", "asset_type_id");
CREATE INDEX "idx_assets_tenant_id_name" ON "assets" ("tenant_id", "name");
CREATE INDEX "idx_assets_metadata" ON "assets" USING GIN ("metadata");

COMMENT ON TABLE "assets" IS 'Physical infrastructure items tracked by the organization.';
COMMENT ON COLUMN "assets"."metadata" IS 'Flexible JSONB field for tenant-specific custom attributes (e.g., height, capacity, manufacturer).';
COMMENT ON COLUMN "assets"."deleted_at" IS 'Soft delete timestamp. Non-null means the asset is logically deleted.';

-- ============================================================================
-- 5. CAMERAS
-- ============================================================================
CREATE TABLE "cameras" (
    "id"                SERIAL       PRIMARY KEY,
    "tenant_id"         INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "asset_id"          INTEGER      REFERENCES "assets"("id") ON DELETE SET NULL,
    "name"              VARCHAR(255) NOT NULL,
    "camera_type"       VARCHAR(50)  NOT NULL DEFAULT 'IP',
    "rtsp_url"          TEXT,
    "ip_address"        INET,
    "manufacturer"      VARCHAR(100),
    "model"             VARCHAR(100),
    "resolution"        VARCHAR(20),
    "config"            JSONB        DEFAULT '{}',
    "status"            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    "installation_date" DATE,
    "last_seen_at"      TIMESTAMPTZ,
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_cameras_valid_type"
        CHECK ("camera_type" IN ('IP', 'ANALOG', 'PTZ', 'THERMAL', 'DRONE', 'OTHER')),
    CONSTRAINT "ck_cameras_valid_status"
        CHECK ("status" IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE'))
);

CREATE INDEX "idx_cameras_tenant_id" ON "cameras" ("tenant_id");
CREATE INDEX "idx_cameras_tenant_id_asset_id" ON "cameras" ("tenant_id", "asset_id");
CREATE INDEX "idx_cameras_tenant_id_status" ON "cameras" ("tenant_id", "status");

COMMENT ON TABLE "cameras" IS 'CCTV, IP cameras, and visual sensors. Optionally linked to an asset.';
COMMENT ON COLUMN "cameras"."rtsp_url" IS 'RTSP stream URL for the camera. Used in V1.1 for live AI inference.';
COMMENT ON COLUMN "cameras"."config" IS 'Camera-specific config: FoV, recording schedule, rotation, etc.';

-- ============================================================================
-- 6. INSPECTIONS
-- ============================================================================
CREATE TABLE "inspections" (
    "id"             SERIAL       PRIMARY KEY,
    "tenant_id"      INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "asset_id"       INTEGER      NOT NULL REFERENCES "assets"("id") ON DELETE RESTRICT,
    "inspector_id"   INTEGER      REFERENCES "users"("id") ON DELETE SET NULL,
    "scheduled_date" DATE         NOT NULL,
    "completed_at"   TIMESTAMPTZ,
    "notes"          TEXT,
    "status"         VARCHAR(20)  NOT NULL DEFAULT 'SCHEDULED',
    "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_inspections_valid_status"
        CHECK ("status" IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'))
);

CREATE INDEX "idx_inspections_tenant_id" ON "inspections" ("tenant_id");
CREATE INDEX "idx_inspections_tenant_id_status" ON "inspections" ("tenant_id", "status");
CREATE INDEX "idx_inspections_tenant_id_asset_id" ON "inspections" ("tenant_id", "asset_id");
CREATE INDEX "idx_inspections_tenant_id_inspector_id" ON "inspections" ("tenant_id", "inspector_id");
CREATE INDEX "idx_inspections_scheduled_date" ON "inspections" ("scheduled_date");

COMMENT ON TABLE "inspections" IS 'Scheduled and completed asset inspections. Assigned to inspectors.';

-- ============================================================================
-- 7. INSPECTION IMAGES
-- ============================================================================
CREATE TABLE "inspection_images" (
    "id"            SERIAL       PRIMARY KEY,
    "inspection_id" INTEGER      NOT NULL REFERENCES "inspections"("id") ON DELETE CASCADE,
    "camera_id"     INTEGER      REFERENCES "cameras"("id") ON DELETE SET NULL,
    "image_url"     TEXT         NOT NULL,
    "thumbnail_url" TEXT,
    "file_size"     BIGINT,
    "mime_type"     VARCHAR(50)  DEFAULT 'image/jpeg',
    "exif_data"     JSONB        DEFAULT '{}',
    "captured_at"   TIMESTAMPTZ,
    "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_inspection_images_valid_mime"
        CHECK ("mime_type" IN ('image/jpeg', 'image/png', 'image/webp', 'image/heic'))
);

CREATE INDEX "idx_inspection_images_inspection_id" ON "inspection_images" ("inspection_id");

COMMENT ON TABLE "inspection_images" IS 'Photos attached to inspections. Stored in S3, URLs referenced here.';

-- ============================================================================
-- 8. INCIDENTS
-- ============================================================================
CREATE TABLE "incidents" (
    "id"              SERIAL       PRIMARY KEY,
    "tenant_id"       INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "asset_id"        INTEGER      REFERENCES "assets"("id") ON DELETE SET NULL,
    "reported_by_id"  INTEGER      NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "assigned_to_id"  INTEGER      REFERENCES "users"("id") ON DELETE SET NULL,
    "title"           VARCHAR(500) NOT NULL,
    "description"     TEXT,
    "severity"        VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    "status"          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    "source"          VARCHAR(20)  NOT NULL DEFAULT 'MANUAL',
    "resolved_at"     TIMESTAMPTZ,
    "closed_at"       TIMESTAMPTZ,
    "deleted_at"      TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_incidents_valid_severity"
        CHECK ("severity" IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT "ck_incidents_valid_status"
        CHECK ("status" IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    CONSTRAINT "ck_incidents_valid_source"
        CHECK ("source" IN ('MANUAL', 'INSPECTION', 'AI', 'SENSOR', 'EXTERNAL'))
);

CREATE INDEX "idx_incidents_tenant_id" ON "incidents" ("tenant_id");
CREATE INDEX "idx_incidents_tenant_id_status" ON "incidents" ("tenant_id", "status") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_incidents_tenant_id_severity" ON "incidents" ("tenant_id", "severity") WHERE "deleted_at" IS NULL;
CREATE INDEX "idx_incidents_tenant_id_asset_id" ON "incidents" ("tenant_id", "asset_id");
CREATE INDEX "idx_incidents_tenant_id_assigned_to_id" ON "incidents" ("tenant_id", "assigned_to_id");

COMMENT ON TABLE "incidents" IS 'Reported problems, damage, or safety hazards. Lifecycle: OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED.';
COMMENT ON COLUMN "incidents"."source" IS 'Origin of the incident: MANUAL (user-created), INSPECTION, AI (V1.1), SENSOR, EXTERNAL.';

-- ============================================================================
-- 9. INCIDENT COMMENTS
-- ============================================================================
CREATE TABLE "incident_comments" (
    "id"          SERIAL       PRIMARY KEY,
    "incident_id" INTEGER      NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
    "user_id"     INTEGER      NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "content"     TEXT         NOT NULL,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_incident_comments_incident_id" ON "incident_comments" ("incident_id");

COMMENT ON TABLE "incident_comments" IS 'User comments and updates on incidents. Append-only timeline.';

-- ============================================================================
-- 10. INCIDENT ATTACHMENTS
-- ============================================================================
CREATE TABLE "incident_attachments" (
    "id"          SERIAL       PRIMARY KEY,
    "incident_id" INTEGER      NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
    "file_url"    TEXT         NOT NULL,
    "file_name"   VARCHAR(255) NOT NULL,
    "file_type"   VARCHAR(50)  NOT NULL,
    "file_size"   BIGINT       NOT NULL DEFAULT 0,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_incident_attachments_incident_id" ON "incident_attachments" ("incident_id");

COMMENT ON TABLE "incident_attachments" IS 'Files attached to incidents (photos, documents). Stored in S3.';

-- ============================================================================
-- 11. REPORTS
-- ============================================================================
CREATE TABLE "reports" (
    "id"            SERIAL       PRIMARY KEY,
    "tenant_id"     INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "created_by_id" INTEGER      NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "title"         VARCHAR(255) NOT NULL,
    "report_type"   VARCHAR(20)  NOT NULL DEFAULT 'SUMMARY',
    "start_date"    DATE         NOT NULL,
    "end_date"      DATE         NOT NULL,
    "status"        VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    "file_url"      TEXT,
    "file_format"   VARCHAR(10)  DEFAULT 'PDF',
    "completed_at"  TIMESTAMPTZ,
    "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_reports_valid_type"
        CHECK ("report_type" IN ('SUMMARY', 'DETAILED', 'COMPLIANCE', 'CUSTOM')),
    CONSTRAINT "ck_reports_valid_status"
        CHECK ("status" IN ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED')),
    CONSTRAINT "ck_reports_valid_format"
        CHECK ("file_format" IN ('PDF', 'CSV', 'XLSX')),
    CONSTRAINT "ck_reports_valid_dates"
        CHECK ("start_date" <= "end_date")
);

CREATE INDEX "idx_reports_tenant_id" ON "reports" ("tenant_id");
CREATE INDEX "idx_reports_tenant_id_status" ON "reports" ("tenant_id", "status");

COMMENT ON TABLE "reports" IS 'Generated reports. Status lifecycle: PENDING → GENERATING → COMPLETED/FAILED.';

-- ============================================================================
-- 12. ORG SETTINGS
-- ============================================================================
CREATE TABLE "org_settings" (
    "id"                  SERIAL       PRIMARY KEY,
    "tenant_id"           INTEGER      NOT NULL UNIQUE REFERENCES "organizations"("id") ON DELETE CASCADE,
    "timezone"            VARCHAR(50)  NOT NULL DEFAULT 'UTC',
    "date_format"         VARCHAR(20)  NOT NULL DEFAULT 'YYYY-MM-DD',
    "logo_url"            TEXT,
    "notification_config" JSONB        DEFAULT '{"email": true, "slack": false, "slack_webhook_url": null}',
    "feature_flags"       JSONB        DEFAULT '{}',
    "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE "org_settings" IS 'Per-tenant configuration settings. One-to-one with organizations.';

-- ============================================================================
-- 13. AUDIT LOGS
-- ============================================================================
CREATE TABLE "audit_logs" (
    "id"          BIGSERIAL    PRIMARY KEY,
    "tenant_id"   INTEGER      NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
    "user_id"     INTEGER      REFERENCES "users"("id") ON DELETE SET NULL,
    "action"      VARCHAR(50)  NOT NULL,
    "entity_type" VARCHAR(50)  NOT NULL,
    "entity_id"   INTEGER,
    "old_values"  JSONB,
    "new_values"  JSONB,
    "ip_address"  INET,
    "user_agent"  TEXT,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX "idx_audit_logs_tenant_id" ON "audit_logs" ("tenant_id");
CREATE INDEX "idx_audit_logs_tenant_id_entity" ON "audit_logs" ("tenant_id", "entity_type", "entity_id");
CREATE INDEX "idx_audit_logs_tenant_id_created_at" ON "audit_logs" ("tenant_id", "created_at" DESC);
CREATE INDEX "idx_audit_logs_tenant_id_user_id" ON "audit_logs" ("tenant_id", "user_id");

COMMENT ON TABLE "audit_logs" IS 'Immutable audit trail. Append-only. Records all create/update/delete operations.';
COMMENT ON COLUMN "audit_logs"."action" IS 'Action performed: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, PASSWORD_CHANGE, etc.';

-- ============================================================================
-- 14. REFRESH TOKENS
-- ============================================================================
CREATE TABLE "refresh_tokens" (
    "id"          SERIAL       PRIMARY KEY,
    "user_id"     INTEGER      NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token_hash"  VARCHAR(64)  NOT NULL UNIQUE,
    "expires_at"  TIMESTAMPTZ  NOT NULL,
    "revoked_at"  TIMESTAMPTZ,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ck_refresh_tokens_not_expired"
        CHECK ("expires_at" > "created_at")
);

CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
CREATE INDEX "idx_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash");
CREATE INDEX "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expires_at") WHERE "revoked_at" IS NULL;

COMMENT ON TABLE "refresh_tokens" IS 'JWT refresh tokens. Hashed for security. Supports revocation.';

-- ============================================================================
-- 15. UPDATE TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "organizations"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "users"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "asset_types"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "assets"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "cameras"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "inspections"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "incidents"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "org_settings"
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

---

## Prisma Schema

The corresponding Prisma schema that generates this migration:

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== ORGANIZATIONS ====================

model Organization {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(255)
  domain    String?  @unique @db.VarChar(255)
  plan      String   @default("STARTER") @db.VarChar(50)
  logoUrl   String?  @map("logo_url")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users      User[]
  assetTypes AssetType[]
  assets     Asset[]
  cameras    Camera[]
  inspections Inspection[]
  incidents  Incident[]
  reports    Report[]
  settings   OrgSettings?
  auditLogs  AuditLog[]

  @@map("organizations")
}

// ==================== USERS ====================

model User {
  id             Int       @id @default(autoincrement())
  tenantId       Int       @map("tenant_id")
  name           String    @db.VarChar(255)
  email          String    @db.VarChar(320)
  hashedPassword String    @map("hashed_password")
  role           String    @default("INSPECTOR") @db.VarChar(20)
  avatarUrl      String?   @map("avatar_url")
  phone          String?   @db.VarChar(20)
  isActive       Boolean   @default(true) @map("is_active")
  lastLoginAt    DateTime? @map("last_login_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  organization      Organization       @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  createdAssets     Asset[]            @relation("AssetCreatedBy")
  inspections       Inspection[]
  reportedIncidents Incident[]         @relation("IncidentReportedBy")
  assignedIncidents Incident[]         @relation("IncidentAssignedTo")
  reports           Report[]
  incidentComments  IncidentComment[]
  refreshTokens     RefreshToken[]
  auditLogs         AuditLog[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([tenantId, role])
  @@index([email])
  @@map("users")
}

// ==================== ASSET TYPES ====================

model AssetType {
  id          Int      @id @default(autoincrement())
  tenantId    Int      @map("tenant_id")
  name        String   @db.VarChar(100)
  description String?
  icon        String?  @db.VarChar(50)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  assets       Asset[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@map("asset_types")
}

// ==================== ASSETS ====================

model Asset {
  id          Int       @id @default(autoincrement())
  tenantId    Int       @map("tenant_id")
  assetTypeId Int?      @map("asset_type_id")
  createdById Int?      @map("created_by_id")
  name        String    @db.VarChar(255)
  description String?
  latitude    Decimal?  @db.Decimal(10, 7)
  longitude   Decimal?  @db.Decimal(10, 7)
  address     String?
  metadata    Json      @default("{}") @db.JsonB
  status      String    @default("ACTIVE") @db.VarChar(20)
  deletedAt   DateTime? @map("deleted_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  organization Organization  @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  assetType    AssetType?    @relation(fields: [assetTypeId], references: [id], onDelete: SetNull)
  createdBy    User?         @relation("AssetCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  cameras      Camera[]
  inspections  Inspection[]
  incidents    Incident[]

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, assetTypeId])
  @@index([tenantId, name])
  @@map("assets")
}

// ==================== CAMERAS ====================

model Camera {
  id               Int       @id @default(autoincrement())
  tenantId         Int       @map("tenant_id")
  assetId          Int?      @map("asset_id")
  name             String    @db.VarChar(255)
  cameraType       String    @default("IP") @map("camera_type") @db.VarChar(50)
  rtspUrl          String?   @map("rtsp_url")
  ipAddress        String?   @map("ip_address")
  manufacturer     String?   @db.VarChar(100)
  model            String?   @db.VarChar(100)
  resolution       String?   @db.VarChar(20)
  config           Json      @default("{}") @db.JsonB
  status           String    @default("ACTIVE") @db.VarChar(20)
  installationDate DateTime? @map("installation_date") @db.Date
  lastSeenAt       DateTime? @map("last_seen_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  organization     Organization      @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  asset            Asset?            @relation(fields: [assetId], references: [id], onDelete: SetNull)
  inspectionImages InspectionImage[]

  @@index([tenantId])
  @@index([tenantId, assetId])
  @@index([tenantId, status])
  @@map("cameras")
}

// ==================== INSPECTIONS ====================

model Inspection {
  id            Int       @id @default(autoincrement())
  tenantId      Int       @map("tenant_id")
  assetId       Int       @map("asset_id")
  inspectorId   Int?      @map("inspector_id")
  scheduledDate DateTime  @map("scheduled_date") @db.Date
  completedAt   DateTime? @map("completed_at")
  notes         String?
  status        String    @default("SCHEDULED") @db.VarChar(20)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  organization Organization      @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  asset        Asset             @relation(fields: [assetId], references: [id], onDelete: Restrict)
  inspector    User?             @relation(fields: [inspectorId], references: [id], onDelete: SetNull)
  images       InspectionImage[]

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, assetId])
  @@index([tenantId, inspectorId])
  @@index([scheduledDate])
  @@map("inspections")
}

// ==================== INSPECTION IMAGES ====================

model InspectionImage {
  id           Int       @id @default(autoincrement())
  inspectionId Int       @map("inspection_id")
  cameraId     Int?      @map("camera_id")
  imageUrl     String    @map("image_url")
  thumbnailUrl String?   @map("thumbnail_url")
  fileSize     BigInt?   @map("file_size")
  mimeType     String?   @default("image/jpeg") @map("mime_type") @db.VarChar(50)
  exifData     Json      @default("{}") @map("exif_data") @db.JsonB
  capturedAt   DateTime? @map("captured_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  inspection Inspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  camera     Camera?    @relation(fields: [cameraId], references: [id], onDelete: SetNull)

  @@index([inspectionId])
  @@map("inspection_images")
}

// ==================== INCIDENTS ====================

model Incident {
  id           Int       @id @default(autoincrement())
  tenantId     Int       @map("tenant_id")
  assetId      Int?      @map("asset_id")
  reportedById Int       @map("reported_by_id")
  assignedToId Int?      @map("assigned_to_id")
  title        String    @db.VarChar(500)
  description  String?
  severity     String    @default("MEDIUM") @db.VarChar(20)
  status       String    @default("OPEN") @db.VarChar(20)
  source       String    @default("MANUAL") @db.VarChar(20)
  resolvedAt   DateTime? @map("resolved_at")
  closedAt     DateTime? @map("closed_at")
  deletedAt    DateTime? @map("deleted_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  organization Organization          @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  asset        Asset?                @relation(fields: [assetId], references: [id], onDelete: SetNull)
  reportedBy   User                  @relation("IncidentReportedBy", fields: [reportedById], references: [id], onDelete: Restrict)
  assignedTo   User?                 @relation("IncidentAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)
  comments     IncidentComment[]
  attachments  IncidentAttachment[]

  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, severity])
  @@index([tenantId, assetId])
  @@index([tenantId, assignedToId])
  @@map("incidents")
}

// ==================== INCIDENT COMMENTS ====================

model IncidentComment {
  id         Int      @id @default(autoincrement())
  incidentId Int      @map("incident_id")
  userId     Int      @map("user_id")
  content    String
  createdAt  DateTime @default(now()) @map("created_at")

  incident Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([incidentId])
  @@map("incident_comments")
}

// ==================== INCIDENT ATTACHMENTS ====================

model IncidentAttachment {
  id         Int      @id @default(autoincrement())
  incidentId Int      @map("incident_id")
  fileUrl    String   @map("file_url")
  fileName   String   @map("file_name") @db.VarChar(255)
  fileType   String   @map("file_type") @db.VarChar(50)
  fileSize   BigInt   @default(0) @map("file_size")
  createdAt  DateTime @default(now()) @map("created_at")

  incident Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)

  @@index([incidentId])
  @@map("incident_attachments")
}

// ==================== REPORTS ====================

model Report {
  id          Int       @id @default(autoincrement())
  tenantId    Int       @map("tenant_id")
  createdById Int       @map("created_by_id")
  title       String    @db.VarChar(255)
  reportType  String    @default("SUMMARY") @map("report_type") @db.VarChar(20)
  startDate   DateTime  @map("start_date") @db.Date
  endDate     DateTime  @map("end_date") @db.Date
  status      String    @default("PENDING") @db.VarChar(20)
  fileUrl     String?   @map("file_url")
  fileFormat  String?   @default("PDF") @map("file_format") @db.VarChar(10)
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  organization Organization @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  createdBy    User         @relation(fields: [createdById], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([tenantId, status])
  @@map("reports")
}

// ==================== ORG SETTINGS ====================

model OrgSettings {
  id                 Int      @id @default(autoincrement())
  tenantId           Int      @unique @map("tenant_id")
  timezone           String   @default("UTC") @db.VarChar(50)
  dateFormat         String   @default("YYYY-MM-DD") @map("date_format") @db.VarChar(20)
  logoUrl            String?  @map("logo_url")
  notificationConfig Json     @default("{\"email\": true, \"slack\": false}") @map("notification_config") @db.JsonB
  featureFlags       Json     @default("{}") @map("feature_flags") @db.JsonB
  updatedAt          DateTime @updatedAt @map("updated_at")

  organization Organization @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("org_settings")
}

// ==================== AUDIT LOGS ====================

model AuditLog {
  id         BigInt    @id @default(autoincrement())
  tenantId   Int       @map("tenant_id")
  userId     Int?      @map("user_id")
  action     String    @db.VarChar(50)
  entityType String    @map("entity_type") @db.VarChar(50)
  entityId   Int?      @map("entity_id")
  oldValues  Json?     @map("old_values") @db.JsonB
  newValues  Json?     @map("new_values") @db.JsonB
  ipAddress  String?   @map("ip_address")
  userAgent  String?   @map("user_agent")
  createdAt  DateTime  @default(now()) @map("created_at")

  organization Organization @relation(fields: [tenantId], references: [id], onDelete: Restrict)
  user         User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([tenantId, entityType, entityId])
  @@index([tenantId, createdAt(sort: Desc)])
  @@index([tenantId, userId])
  @@map("audit_logs")
}

// ==================== REFRESH TOKENS ====================

model RefreshToken {
  id        Int       @id @default(autoincrement())
  userId    Int       @map("user_id")
  tokenHash String    @unique @map("token_hash") @db.VarChar(64)
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@map("refresh_tokens")
}
```

---

## Row-Level Security Policies

```sql
-- ============================================================================
-- ROW-LEVEL SECURITY (Defense-in-Depth)
-- Applied AFTER application-level tenant scoping
-- ============================================================================

-- Enable RLS on tenant-scoped tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cameras" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inspections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- Create a function to get current tenant from session
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS INTEGER AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::INTEGER;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies (example for assets - repeat pattern for other tables)
CREATE POLICY tenant_isolation_select ON "assets"
    FOR SELECT USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_isolation_insert ON "assets"
    FOR INSERT WITH CHECK ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_isolation_update ON "assets"
    FOR UPDATE USING ("tenant_id" = current_tenant_id());

CREATE POLICY tenant_isolation_delete ON "assets"
    FOR DELETE USING ("tenant_id" = current_tenant_id());

-- Repeat for all tenant-scoped tables
-- (users, asset_types, cameras, inspections, incidents, reports, audit_logs)
```

> [!NOTE]
> RLS policies are a defense-in-depth measure. The primary tenant isolation is enforced in the application layer (Prisma middleware). RLS catches any bugs in application code that might accidentally omit the `tenant_id` filter.

---

## Verification Queries

After running the migration, verify with:

```sql
-- Check all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected: 14 tables (including _prisma_migrations)

-- Check all indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check all constraints
SELECT conname, conrelid::regclass AS table_name, contype
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

-- Check RLS is enabled
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;
```

---

## Related Documents

- **Previous:** [Migration Strategy](./01-migration-strategy.md)
- **Next:** [Organization Table](./03-organization-table.md)
- **Entity Details:** See individual table documents (03-09)
- **Seed Data:** [Seed Data](./11-seed-data.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
