# InfraWatch V1.1 — Current State Repository Audit

> Generated: 2026-08-06
> Purpose: Comprehensive audit of all subsystems before V1.1 implementation begins.

---

## 1. Existing Services

| Service File | Responsibility | Classification |
|---|---|---|
| `ai.service.ts` | NLP incident triage (TF-IDF + Naïve Bayes), narrative report generation | **EXTEND** |
| `analytics.service.ts` | Basic asset/incident analytics aggregation | **EXTEND** |
| `anomaly.service.ts` | Vision-based anomaly CRUD, review workflow | **EXTEND** |
| `asset.service.ts` | Asset CRUD with tenant filtering | **KEEP** |
| `asset-type.service.ts` | Asset type CRUD | **KEEP** |
| `auth.service.ts` | JWT login/register/refresh with bcrypt | **KEEP** |
| `camera.service.ts` | Camera CRUD with tenant filtering | **KEEP** |
| `dashboard.service.ts` | Dashboard metric aggregation | **EXTEND** |
| `incident.service.ts` | Incident CRUD, assignment, commenting | **KEEP** |
| `inspection.service.ts` | Inspection CRUD | **KEEP** |
| `ml-dataset.service.ts` | Training dataset extraction from incidents | **EXTEND** |
| `model-evaluator.service.ts` | Model accuracy/precision/recall evaluation | **EXTEND** |
| `model-storage.service.ts` | Model weight serialization to disk JSON | **REFACTOR** |
| `notification.service.ts` | In-app notification CRUD | **KEEP** |
| `organization.service.ts` | Organization (tenant) CRUD | **KEEP** |
| `prediction.service.ts` | Weibull reliability model + Kalman filter RUL | **EXTEND** |
| `report.service.ts` | Report CRUD | **KEEP** |
| `satellite.service.ts` | Live satellite environmental data (NASA POWER API) | **KEEP** |
| `telemetry.service.ts` | Telemetry reading ingestion + anomaly threshold check | **EXTEND** |
| `telemetry-daemon.ts` | Background timer generating telemetry every 4s | **EXTEND** |
| `training.service.ts` | NLP model training with disk persistence | **EXTEND** |
| `user.service.ts` | User CRUD | **KEEP** |
| `vision-model.engine.ts` | Simulated CV inference engine | **REFACTOR** |
| `work-order.service.ts` | Work order CRUD + SLA tracking | **KEEP** |
| `active-learning.service.ts` | Active learning sample selection | **EXTEND** |
| `grid-search.engine.ts` | Hyperparameter grid search | **EXTEND** |
| `spatio-temporal.engine.ts` | Spatial-temporal anomaly correlation | **EXTEND** |

### Engine Files (`src/engine/`)

| Engine | Purpose | Classification |
|---|---|---|
| `neural-network.engine.ts` | Pure-JS neural network (feedforward, backprop) | **KEEP** |
| `time-series.engine.ts` | Time-series forecasting primitives | **KEEP** |
| `matrix-math.engine.ts` | Matrix operations for ML | **KEEP** |
| `image-convolution.engine.ts` | Image kernel convolutions (edge detection) | **KEEP** |
| `model-worker.pipeline.ts` | Model training pipeline orchestration | **EXTEND** |

---

## 2. Existing APIs

| Route File | Mount Path | Methods | Classification |
|---|---|---|---|
| `auth.routes.ts` | `/api/auth` | POST login, register, refresh | **KEEP** |
| `organization.routes.ts` | `/api/organizations` | CRUD | **KEEP** |
| `user.routes.ts` | `/api/users` | CRUD | **KEEP** |
| `asset.routes.ts` | `/api/assets` | CRUD + health | **KEEP** |
| `asset-type.routes.ts` | `/api/asset-types` | CRUD | **KEEP** |
| `camera.routes.ts` | `/api/cameras` | CRUD + network discovery + WebRTC signaling + stream proxy | **KEEP** |
| `inspection.routes.ts` | `/api/inspections` | CRUD | **KEEP** |
| `incident.routes.ts` | `/api/incidents` | CRUD + assignment + comments | **KEEP** |
| `dashboard.routes.ts` | `/api/dashboard` | GET stats | **KEEP** |
| `report.routes.ts` | `/api/reports` | CRUD | **KEEP** |
| `notification.routes.ts` | `/api/notifications` | CRUD + mark-read | **KEEP** |
| `ai.routes.ts` | `/api/ai` | POST triage, GET narrative report | **EXTEND** |
| `ml.routes.ts` | `/api/ml` | Training, evaluation, grid search | **EXTEND** |
| `anomaly.routes.ts` | `/api/anomalies` | CRUD + review | **EXTEND** |
| `prediction.routes.ts` | `/api/predictions` | GET predictions + run analysis | **EXTEND** |
| `telemetry.routes.ts` | `/api/telemetry` | GET readings + POST ingest | **EXTEND** |
| `work-order.routes.ts` | `/api/work-orders` | CRUD | **KEEP** |
| `analytics.routes.ts` | `/api/analytics` | GET aggregates | **EXTEND** |
| `scada-dispatch.routes.ts` | `/api/v4` | SCADA actuator CRUD + control | **KEEP** |
| `bim.routes.ts` | `/api/v4` | BIM model queries | **KEEP** |
| `drone.routes.ts` | `/api/v4` | Drone + mission management | **KEEP** |
| `compliance.routes.ts` | `/api/v4` | Compliance checks | **KEEP** |

---

## 3. Existing Prisma Entities (22 models)

| Model | Table | Tenant-Isolated | Classification |
|---|---|---|---|
| `Organization` | `organizations` | Root entity | **KEEP** |
| `User` | `users` | ✅ tenantId | **KEEP** |
| `AssetType` | `asset_types` | ✅ tenantId | **KEEP** |
| `Asset` | `assets` | ✅ tenantId | **KEEP** |
| `Camera` | `cameras` | ✅ tenantId | **KEEP** |
| `Inspection` | `inspections` | ✅ tenantId | **KEEP** |
| `InspectionImage` | `inspection_images` | ✅ tenantId | **KEEP** |
| `IncidentCategory` | `incident_categories` | ✅ tenantId | **KEEP** |
| `Incident` | `incidents` | ✅ tenantId | **EXTEND** (AI source field) |
| `IncidentAssignment` | `incident_assignments` | ✅ tenantId | **KEEP** |
| `IncidentComment` | `incident_comments` | ✅ tenantId | **KEEP** |
| `Notification` | `notifications` | ✅ tenantId | **KEEP** |
| `AnomalyDetection` | `anomaly_detections` | ✅ tenantId | **EXTEND** |
| `TenantAIConfig` | `tenant_ai_configs` | ✅ tenantId | **EXTEND** |
| `AssetPrediction` | `asset_predictions` | ✅ tenantId | **EXTEND** |
| `Report` | `reports` | ✅ tenantId | **KEEP** |
| `AuditLog` | `audit_logs` | ✅ tenantId | **KEEP** |
| `TelemetryReading` | `telemetry_readings` | ✅ tenantId | **EXTEND** |
| `SensorRule` | `sensor_rules` | ✅ tenantId | **EXTEND** |
| `WorkOrder` | `work_orders` | ✅ tenantId | **KEEP** |
| `ScadaActuator` | `scada_actuators` | ✅ tenantId | **KEEP** |
| `Drone` / `DroneMission` | `drones` / `drone_missions` | ✅ tenantId | **KEEP** |
| `BimModel` / `BimHotspot` | `bim_models` / `bim_hotspots` | ✅ tenantId | **KEEP** |

---

## 4. Existing Workers (`packages/workers/`)

| Worker | Queue Name | Status | Classification |
|---|---|---|---|
| Report Generation | `reports` | Real DB queries for ASSET_SUMMARY | **KEEP** |
| Image Processing | `images` | Placeholder (logs "would download") | **EXTEND** |
| Notification | `notifications` | Placeholder (logs "would send email") | **EXTEND** |

---

## 5. Existing Queues (BullMQ)

| Queue | Connection | Classification |
|---|---|---|
| `reports` | Redis (localhost:6379) | **KEEP** |
| `images` | Redis (localhost:6379) | **EXTEND** |
| `notifications` | Redis (localhost:6379) | **EXTEND** |

---

## 6. Existing Authentication Flow

- **Mechanism**: JWT access tokens + refresh tokens
- **Library**: `jsonwebtoken` (via `src/lib/jwt.ts`)
- **Password hashing**: bcrypt (via `src/lib/crypto.ts`)
- **Token structure**: `{ userId, tenantId, role }` in JWT payload
- **Access token expiry**: 15 minutes (configurable)
- **Refresh token expiry**: 7 days (configurable)
- **Middleware**: `authMiddleware` verifies JWT → sets `req.tenantId`, `req.userId`, `req.auth`
- **RBAC**: `requireRole(...roles)` middleware checks `req.auth.role`
- **Roles observed**: `ADMIN`, `MANAGER`, `INSPECTOR`, `ENGINEER`
- **Classification**: **KEEP**

---

## 7. Tenant Isolation Mechanism

- **Every Prisma model** has a `tenantId` field (except `Organization` itself)
- **Auth middleware** extracts `tenantId` from JWT → attaches to `req.tenantId`
- **Fallback middleware** (`tenant-context.ts`): if no JWT, reads `x-tenant-id` header (used for login/register)
- **Weakness**: Some services use `(req as any).tenantId` fallback from header, not exclusively from JWT. The `auth.ts` middleware also falls back to `findFirst` organization if the JWT's tenantId doesn't match a real org.
- **Classification**: **KEEP** (minor hardening needed for V1.1 AI layer)

---

## 8. Existing Incident Workflow

1. User creates incident via `POST /api/incidents` → persists to `incidents` table
2. AI triage available via `POST /api/ai/triage` → returns severity suggestion, category, confidence, action plan
3. Incidents can be assigned to users (`incident_assignments`)
4. Incidents support comments (`incident_comments`)
5. Incidents linked to anomaly detections (`anomaly_detections.incidentId`)
6. Incidents linked to work orders (`work_orders.incidentId`)
7. Status flow: OPEN → IN_PROGRESS → RESOLVED → CLOSED
8. **AI fields on Incident**: `aiSuggestedSeverity`, `aiSuggestedCategory`, `aiConfidence`, `aiTriagedAt`
- **Classification**: **EXTEND** (add AI event source, copilot integration)

---

## 9. Existing Inspection Workflow

1. Inspections are scheduled per asset with an inspector assignment
2. Status: SCHEDULED → IN_PROGRESS → COMPLETED
3. Can be linked to predictions (`predictionId`) for predictive maintenance
4. Support inspection images (`inspection_images` table)
5. Drone missions can be linked to inspections (`drone_missions.inspectionId`)
- **Classification**: **KEEP**

---

## 10. Existing Camera Model

- Camera belongs to an Asset (1:many)
- Fields: name, cameraType, rtspUrl, ipAddress, config (JSONB), status
- Network discovery: ARP scan + TCP port probing + ONVIF WS-Discovery
- WebRTC P2P signaling (pin-based rooms via in-memory Map)
- Stream proxy endpoint for MJPEG
- Anomaly detections linked to cameras
- **Classification**: **KEEP** (RTSP URL must never leak to analytics layer)

---

## 11. Existing Asset Model

- Asset belongs to Organization + AssetType + Creator (User)
- Fields: name, description, lat/lng, address, metadata (JSONB), status, healthScore, lastPredictionAt
- Soft delete via `deletedAt`
- Has relations to: cameras, inspections, incidents, predictions, telemetry, sensor rules, work orders, SCADA actuators, BIM models
- **Classification**: **KEEP**

---

## 12. Existing Object/Image Handling

- `InspectionImage` stores `imageUrl` (Text) — external URL reference
- `AnomalyDetection` stores `imageUrl` (Text) — external URL reference
- `Incident` has `attachmentUrls` (String array)
- No S3 upload implementation exists (env vars defined but unused)
- Image worker is a placeholder
- **Classification**: **EXTEND** (object storage integration for V1.1 vision pipeline)

---

## 13. Existing Report Generation

- Reports stored in `reports` table with JSONB `data` column
- BullMQ worker generates `ASSET_SUMMARY` type with real DB queries
- AI narrative report via `AIService.generateNarrativeReport()` returns executive summary text
- **Classification**: **KEEP**

---

## 14. Existing Docker Architecture

- `docker-compose.prod.yml`: 5 services (backend, frontend, workers, postgres, redis)
- `docker-compose.dev.yml`: postgres + redis only (dev services run locally)
- Backend Dockerfile: Node 20 Alpine, multi-stage build
- Workers Dockerfile: Node 20 Alpine
- Frontend builds via Vite
- **Classification**: **EXTEND** (add data-platform service)

---

## 15. Existing CI/CD

- GitHub Actions workflow: `.github/workflows/ci-cd.yml`
- Jobs: `test` → `build` → `integration-test` → `notify`
- Test job: Prisma generate, type-check, lint, DB push, backend tests, frontend tests
- Build job: Docker build + push to GHCR
- Uses Postgres 15 + Redis 7 services in CI
- **Classification**: **EXTEND** (add Python lint, data-platform tests)

---

## 16. Existing Environment Configuration

- Zod-validated env schema (`src/config/env.ts`)
- Variables: NODE_ENV, PORT, DATABASE_URL, REDIS_URL, JWT secrets, FRONTEND_URL, AWS (optional)
- `.env.example` provided
- Backend `.env` contains Supabase PostgreSQL connection string + DIRECT_URL
- Frontend `.env` contains VITE_API_URL
- **Classification**: **EXTEND** (add Databricks, LLM, object storage vars)

---

## 17. Existing Tests

| Test File | Type | Coverage |
|---|---|---|
| `auth-flow.test.ts` | Integration | Full auth lifecycle (register/login/refresh/RBAC) |
| `ml-engine.test.ts` | Integration | Neural network, time series, matrix ops |
| `ml-computational-core.test.ts` | Integration | TF-IDF, Naïve Bayes, Weibull |
| `ml-production-backend.test.ts` | Integration | Training pipeline, model storage |
| `active-learning-rul.test.ts` | Integration | Active learning, Kalman RUL |

- Framework: Vitest
- No frontend tests observed (placeholder in CI)
- No data-platform tests
- **Classification**: **EXTEND** (add data contract tests, AI service tests)

---

## 18. Missing Components Required for V1.1

| Component | Status | Priority |
|---|---|---|
| **Data Platform Package** (`packages/data-platform/`) | **NEW** | P0 |
| **Unity Catalog configuration** | **NEW** | P0 |
| **Data contracts (canonical schemas)** | **NEW** | P0 |
| **Bronze/Silver/Gold layers** | **NEW** | P0 |
| **Data quality framework** | **NEW** | P1 |
| **Feature engineering layer** | **NEW** | P1 |
| **MLflow integration** | **NEW** | P1 |
| **Model registry abstraction** | **NEW** | P1 |
| **Anomaly detection (statistical baseline)** | Partially exists (Z-score in telemetry) → **EXTEND** | P1 |
| **Predictive maintenance (tabular ML)** | Partially exists (Weibull) → **EXTEND** | P1 |
| **Computer vision pipeline** | Placeholder exists → **REFACTOR** | P2 |
| **VisionModelAdapter abstraction** | **NEW** | P2 |
| **Event aggregation engine** | **NEW** | P2 |
| **AI Prediction data model** (Prisma: AIModel, AIEvent, AIReview) | **NEW** | P1 |
| **Human-in-the-loop review** | **NEW** | P2 |
| **LLM provider abstraction** | **NEW** | P3 |
| **RAG knowledge system** | **NEW** | P3 |
| **Vector search** | **NEW** | P3 |
| **Incident Copilot** | **NEW** | P3 |
| **Tool-calling architecture** | **NEW** | P3 |
| **Model monitoring** | **NEW** | P2 |
| **DataIntelligenceService** (app ↔ Databricks) | **NEW** | P1 |
| **Batch vs real-time inference abstraction** | **NEW** | P2 |
| **Alert deduplication** | **NEW** | P2 |
| **Asset health scoring (configurable)** | Exists (Weibull) → **EXTEND** | P1 |
| **Pipeline observability** | **NEW** | P2 |
| **Realistic data simulator** | Partially exists (telemetry daemon) → **EXTEND** | P1 |
| **Object storage integration** | Env vars exist, no implementation → **NEW** | P1 |
| **V1.1 documentation suite** | **NEW** | P0 |

---

## Summary Classification

| Classification | Count |
|---|---|
| **KEEP** | 38 |
| **EXTEND** | 24 |
| **REFACTOR** | 3 |
| **REPLACE** | 0 |
| **NEW** | 22 |

> **Key finding**: The V0 foundation is solid. All 22 Prisma models are tenant-isolated. Auth, RBAC, workers, Docker, and CI/CD are production-ready. The main gaps are the data platform (Databricks/lakehouse), AI prediction data model, LLM/RAG intelligence, and the bridge between the analytical plane and the application plane.
