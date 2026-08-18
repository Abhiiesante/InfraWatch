# InfraWatch

**Infrastructure Telemetry, Computer Vision Safety & Medallion Data Platform**

InfraWatch is an open, modular operations platform for monitoring physical assets, warehouse facilities, and distributed infrastructure. It integrates live IoT sensor telemetry, real-time Roboflow computer vision safety tracking, a PySpark/Delta Lake medallion analytical engine, and mobile-first inspection execution into a unified interface.

---

## 🏛️ System Architecture

```
                                    +-----------------------------------------+
                                    |            Frontend (Vite / React)       |
                                    |  • Operations Dashboard  • Incident Board|
                                    |  • Spatial Zone Editor   • AI Review     |
                                    |  • BIM 3D Visualizer     • Field Runs    |
                                    +--------------------+--------------------+
                                                         |
                                      HTTPS REST / WSS   |
                                                         v
                                    +--------------------+--------------------+
                                    |         Backend (Node / Express)         |
                                    |  • Auth & Multi-Tenant RBAC             |
                                    |  • CV Daemon & Frame Ingestion Buffer   |
                                    |  • IoT Telemetry Streamer               |
                                    |  • Asynchronous Report Compiler         |
                                    +---------+--------------------+----------+
                                              |                    |
                         Postgres / Prisma    |                    | Inference API
                                              v                    v
                          +-------------------+---+      +---------+----------+
                          | PostgreSQL Database   |      | Roboflow Inference |
                          | (OLTP / Metadata)     |      | (Object & Hazard)  |
                          +-----------------------+      +--------------------+
                                              |
                                              | Event Streams / Storage Sink
                                              v
                          +---------------------------------------------------+
                          |          Data Intelligence Lakehouse              |
                          |  • Bronze: Raw JSON Event Ingestion               |
                          |  • Silver: Schema Validation & RTSP Sanitization  |
                          |  • Gold: Asset Health, MTTR & Compliance Aggs     |
                          +---------------------------------------------------+
```

---

## ⚡ Key Subsystems

### 1. Computer Vision & Roboflow Safety Tracking
- **Live Frame Ingestion**: Captures frames from RTSP camera streams or WebRTC camera broadcasts.
- **Roboflow Inference API**: Directly queries Roboflow object detection models (`coco/3`, custom logistics safety checkpoints) to track personnel, equipment, and moving automated machinery.
- **Configurable Keep-Out Zones**: Interactive spatial boundary editor allowing operators to configure restricted zones per camera.
- **Alert Deduplication**: Enforces a 30-second cooldown window per violation track to prevent duplicate anomaly alerts from continuous presence.
- **Three-State Honesty Protocol**: Explicitly flags stream status across all interfaces:
  - `🟢 Real Live Inference`
  - `🟡 Real Inference (Awaiting Stream / Offline)`
  - `🔵 Simulated Demo Mode`

### 2. Medallion Lakehouse Data Platform (Python / PySpark)
- **Bronze Layer**: Lossless raw event ingestion across all 6 core domains (`assets`, `cameras`, `incidents`, `inspections`, `image_metadata`, `cv_events`).
- **Silver Layer**: Data cleansing, schema validation, and quarantine table routing.
- **RTSP Credential Sanitization**: Strips embedded authentication credentials from camera stream URLs (`rtsp://***:***@host:port/path`) before analytical persistence.
- **Gold Layer**: Generates domain aggregates including:
  - Dynamic Asset Risk & Health Indices
  - Tenant-level Mean Time to Resolution (MTTR)
  - Inspection Audit Compliance & Completion Rates
- **Local Storage Adapter**: Zero-dependency filesystem fallback when cloud object storage credentials are not configured.

### 3. Mobile-First Field Inspections
- **Execution Mode (`/inspections/:id/execute`)**: Responsive workflow for on-site field engineers.
- **Interactive Checklists**: Standardized verification for structural, mechanical, electrical, and environmental parameters.
- **Photo Evidence Capture**: Direct optical evidence capture with inline thumbnail previews.
- **Automatic Asset Sync**: Completing an inspection immediately updates `lastInspectionAt` and maintenance history on the target asset.

### 4. Operational SCADA & IoT Telemetry
- Sub-second telemetry ingestion for vibration, temperature, acoustic frequency, and grid load.
- Interactive breaker actuators and automated alarm threshold evaluators.

### 5. Incident Kanban & Human-in-the-Loop Review
- 5-stage lifecycle state machine (`OPEN` → `ACKNOWLEDGED` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`) with drag-and-drop transitions.
- Dedicated AI review queue for one-click approval or dismissal of computer vision hazard flags.

---

## 📸 Interface Overview

### Command Center Dashboard (`/dashboard`)
Central operational cockpit featuring live telemetry metrics, health scores, and active incident feeds.

![Command Center Dashboard](./docs/screenshots/dashboard-command-center.png)

---

### Warehouse Safety & Spatial Tracking (`/warehouse`)
Spatial map overlay tracking personnel and machinery relative to restricted keep-out zones.

![Warehouse Safety Tracking](./docs/screenshots/warehouse-logistics.png)

---

### AI Vision & Camera Inventory (`/cameras`)
Surveillance feed grid with transparent stream state badges and hardware registration.

![Camera Inventory and Stream Feed](./docs/screenshots/ai-vision-cameras.png)

---

### 3D BIM CAD Digital Twin (`/bim-twin`)
Interactive 3D WebGL structural wireframe with live stress heatmaps and anchor pier monitoring.

![3D BIM Digital Twin](./docs/screenshots/digital-twin-bim.png)

---

### SCADA Supervisory Control (`/scada`)
Industrial control panel with live power, pressure, and temperature telemetry plus breaker actuators.

![SCADA Supervisory Control](./docs/screenshots/scada-control.png)

---

### Predictive Maintenance Forecasts (`/predictions`)
14-day lookahead failure risk curves, Remaining Useful Life (RUL) projections, and automated service recommendations.

![Predictive Maintenance Engine](./docs/screenshots/predictive-maintenance.png)

---

### Field Inspections Registry (`/inspections`)
Routine audit workflows with mobile camera capture and asset maintenance history linking.

![Field Inspections Registry](./docs/screenshots/bridge-inspection.png)

---

## 📁 Repository Structure

```
infrawatch/
├── packages/
│   ├── backend/             # Node.js + Express REST API & CV Daemon
│   │   ├── prisma/          # Database schema and migrations
│   │   ├── src/services/    # CV Daemon, Roboflow engine, telemetry, reports
│   │   └── src/routes/      # REST API route controllers
│   │
│   ├── frontend/            # React 18 + Vite Web Application
│   │   └── src/features/    # Feature modules (cameras, incidents, logistics, etc.)
│   │
│   └── data-platform/       # Medallion Lakehouse pipelines & tests
│       ├── pipelines/       # Bronze, Silver, and Gold PySpark pipelines
│       ├── contracts/       # Pydantic schema validation contracts
│       └── tests/           # Automated integration test suite
│
└── docs/                    # Architecture documentation & assets
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+
- **Python** 3.11+
- **PostgreSQL** 15+ (or Supabase instance)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/infrawatch.git
cd infrawatch

# Install root & workspace dependencies
npm install

# Setup Python environment for data platform
cd packages/data-platform
pip install -r requirements.txt
cd ../..
```

### 2. Environment Configuration

Copy the sample environment configuration in `packages/backend/.env`:

```ini
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/infrawatch?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/infrawatch?schema=public"

# Roboflow Computer Vision API
ROBOFLOW_API_KEY="your-roboflow-api-key"
ROBOFLOW_MODEL_ID="coco/3"
```

### 3. Database Migration & Seed

```bash
# Generate Prisma Client & apply schema
npm run db:migrate

# Seed demo assets, cameras, inspections, and SCADA sensors
npm run db:seed
```

### 4. Running the Application

```bash
# Launch backend API and frontend development server concurrently
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`

---

## 🧪 Testing & Validation

```bash
# Run Data Platform pipeline contracts & credential sanitization tests
cd packages/data-platform
pytest tests/ -v

# Verify backend TypeScript compilation
cd ../backend
npm run build

# Verify frontend production bundle
cd ../frontend
npm run build
```

---

## 📄 License

MIT © 2026 InfraWatch Contributors.
