# InfraWatch 🛰️⚡

**Industrial Infrastructure Digital Twin, Multi-Modal Computer Vision Safety & Medallion Data Platform**

InfraWatch is an open, modular digital twin and operations platform engineered for monitoring physical infrastructure, industrial plants, electrical substations, logistics warehouses, and municipal assets. It unifies live sub-second IoT sensor telemetry, multi-modal AI vision inspection pipelines (Roboflow + Google Gemini Vision), distinct procedural 3D BIM CAD parametric topologies, a PySpark/Delta Lake medallion lakehouse engine, and field inspection execution into a crisp, high-contrast operational suite.

---

## 🏛️ System Architecture

```
                                    +-------------------------------------------------+
                                    |              Frontend (React 18 / Vite)         |
                                    |  • Real-Time Operations Cockpit  • SCADA Grid   |
                                    |  • Procedural 3D BIM Visualizer  • AMR Tracking |
                                    |  • Work Orders SLA Kanban Board  • GIS Sat Twin |
                                    +------------------------+------------------------+
                                                             |
                                           HTTPS REST / WSS  |  (WebRTC Peer Streams)
                                                             v
                                    +------------------------+------------------------+
                                    |             Backend (Node.js / Express)         |
                                    |  • Multi-Tenant RBAC & Auth Engine              |
                                    |  • CV Daemon & Video Frame Ingestion Streamer   |
                                    |  • IoT Telemetry Ingestion & WebSocket Broadcast|
                                    |  • Asynchronous Automated Report Generator      |
                                    +------------+-----------------------+------------+
                                                 |                       |
                            Postgres / Prisma    |                       | Multi-Modal Inference API
                                                 v                       v
                             +-------------------+---+       +-----------+------------+
                             | PostgreSQL Database   |       | Roboflow & Gemini 2.5  |
                             | (Multi-Tenant OLTP)   |       | AI Vision Engine       |
                             +-----------------------+       +------------------------+
                                                 |
                                                 | Event Streams / Storage Sink
                                                 v
                             +--------------------------------------------------------+
                             |              Data Intelligence Lakehouse               |
                             |  • Bronze: Lossless Raw JSON Event Ingestion           |
                             |  • Silver: Schema Validation & RTSP Sanitization       |
                             |  • Gold: Asset Health, MTTR & Compliance Aggregates    |
                             +--------------------------------------------------------+
```

---

## ⚡ Core Platform Capabilities

### 1. Multi-Modal Computer Vision & Aerial Drone Surveys
- **Autonomous Drone Inspection Pipeline**: Ingests high-resolution aerial flyovers and static surveillance feeds, extracting keyframes with real-time detection bounding boxes.
- **Dual AI Engine**: Integrates Roboflow object detection models (`coco/3`, custom infrastructure defect checkpoints) with Google Gemini Vision reasoning for deep multi-modal failure root-cause analysis.
- **Dynamic Keep-Out Zone Editor**: Interactive 2D spatial canvas allowing operators to define custom polygon and box restricted zones on live feeds with automatic violation tracking.
- **Alert Deduplication Engine**: Enforces a 30-second cooldown window per violation track to prevent duplicate anomaly alerts from continuous presence.
- **Three-State Honesty Protocol**: Explicit stream status indicators:
  - `🟢 Real Live Inference`
  - `🟡 Real Inference (Awaiting Stream / Offline)`
  - `🔵 Simulated Demo Mode`

### 2. Dedicated Procedural 3D BIM CAD Parametric Topologies
Dedicated WebGL/Three.js structural wireframe engines tailored specifically for distinct asset classes:
- **Electrical Substation & HV Terminal**: High-voltage main power transformer, bilateral cooling radiators, 3 HV porcelain bushings, oil conservator drum, dual A-frame lattice gantry towers, and 3-phase busbars.
- **Oil & Gas Refinery Corridor**: Multi-tier pipe sleeper racks, 6 parallel fluid pipelines, elevated thermal expansion U-loop (Omega bend), automated ESD valve manifold, and floating-roof storage tank.
- **Industrial Demolition & Construction Zone**: 4 vertical rebar column cages with spiral tie hoops, multi-tier modular scaffolding tower with diagonal cross-braces, and mobile crane lattice mast with jib boom.
- **Heavy Industrial Plant & Processing Complex**: 14-sided fractionation column with circumferential ring platforms, secondary stripper column, and spherical butane vessel.

### 3. SCADA Emergency Autonomous Control & Failover Interlocks (`/scada`)
- Sub-second industrial telemetry ingestion for 400kV voltage, current load, thermal gradient, and grid vibration.
- Interactive breaker actuators and autonomous trip interlocks for rapid emergency isolation.

### 4. Prophet AI Predictive Maintenance & Degradation Forecasting (`/predictions`)
- 14-day lookahead predictive degradation curves powered by statistical forecasting and sensory baseline drift detection.
- Asset Remaining Useful Life (RUL) estimation with prescriptive maintenance triggers.

### 5. Warehouse Logistics & AMR Fleet Twin (`/warehouse`)
- Real-time Autonomous Mobile Robot (AMR) tracking, storage utilization radial gauges, and 24-hour historical zone violation telemetry.

### 6. Work Orders & SLA Escalation Kanban Board (`/work-orders`)
- Drag-and-drop 3-stage dispatch board (*Pending Dispatch*, *In Progress*, *Completed*) with dynamic SLA countdown badges and one-click dispatch modals.

### 7. Mobile-First Field Inspections & Run Execution (`/inspections`, `/inspections/:id/execute`)
- Responsive on-site audit workflow with interactive Pass/Defect checklist controls, optical photo evidence attachments, and digital sign-off.
- Completing an inspection immediately synchronizes `lastInspectionAt` and maintenance history on the linked facility twin.

### 8. GIS Geospatial Twin with Live Weather Satellite Telemetry (`/gis`)
- Interactive OpenStreetMap geospatial viewer featuring multiple tile modes (`STANDARD`, `DARK`, `SATELLITE`) and live Open-Meteo / NOAA satellite weather telemetry.

### 9. Medallion Lakehouse Analytical Engine (Python / PySpark)
- **Bronze Layer**: Lossless raw event ingestion across all core domains (`assets`, `cameras`, `incidents`, `inspections`, `image_metadata`, `cv_events`).
- **Silver Layer**: Schema validation, quarantine routing, and RTSP credential sanitization (`rtsp://***:***@host:port/path`).
- **Gold Layer**: Domain-level aggregates for asset health indices, Mean Time to Resolution (MTTR), and regulatory audit compliance.

---

## 📸 User Interface Gallery

### 1. Operations Command Center (`/dashboard`)
Central operational cockpit featuring live telemetry metrics, health scores, and active incident feeds.

![Command Center Dashboard](./docs/screenshots/dashboard-command-center.png)

---

### 2. SCADA Autonomous Emergency Control (`/scada`)
Industrial control panel with live power, pressure, and temperature telemetry plus high-voltage breaker actuators.

![SCADA Supervisory Control](./docs/screenshots/scada-control.png)

---

### 3. AI Vision Inspection & Camera Fleet (`/cameras`)
Surveillance feed grid with transparent stream state badges, drone footage analysis, and synthesized intelligence.

![Camera Inventory and Stream Feed](./docs/screenshots/ai-vision-cameras.png)

---

### 4. 3D BIM CAD Digital Twin Visualizer (`/bim-twin`)
Interactive 3D WebGL structural wireframes with real-time stress heatmaps and thermal telemetry overlays.

![3D BIM Digital Twin](./docs/screenshots/digital-twin-bim.png)

---

### 5. Predictive Maintenance & RUL Forecasts (`/predictions`)
14-day lookahead failure risk curves, Remaining Useful Life (RUL) projections, and automated service recommendations.

![Predictive Maintenance Engine](./docs/screenshots/predictive-maintenance.png)

---

### 6. Warehouse Logistics & AMR Twin (`/warehouse`)
Spatial map overlay tracking personnel and AMR fleet movements relative to restricted keep-out zones.

![Warehouse Safety Tracking](./docs/screenshots/warehouse-logistics.png)

---

### 7. Work Orders & SLA Dispatch Kanban (`/work-orders`)
Digital work order lifecycle board with countdown timers, severity priority flags, and assignment modals.

![Work Orders Kanban Board](./docs/screenshots/work-orders-kanban.png)

---

### 8. Field Inspections & Mobile Execution (`/inspections`)
Routine audit workflows with standardized verification checklists and photo evidence capture.

![Field Inspections Registry](./docs/screenshots/field-inspections.png)

---

### 9. Automated Compliance Reports & AI Intelligence (`/reports`)
Automated regulatory compliance audit reporting with Gold CSV exports and AI synthesized executive narratives.

![Compliance Reports](./docs/screenshots/reports-compliance.png)

---

### 10. Engineering Team & Personnel Directory (`/users`)
Organization accounts, certified field inspector management, and RBAC permission tiers.

![Team Personnel Directory](./docs/screenshots/team-users.png)

---

### 11. System & Organization Settings (`/settings`)
Multi-tenant organization branding, profile credentials, and notification thresholds.

![System Settings](./docs/screenshots/system-settings.png)

---

## 📁 Repository Structure

```
infrawatch/
├── packages/
│   ├── backend/             # Node.js + Express REST API & CV Daemon
│   │   ├── prisma/          # PostgreSQL database schema & migrations
│   │   ├── src/services/    # CV Daemon, Roboflow/Gemini AI, Telemetry, SCADA, Reports
│   │   └── src/routes/      # REST API route controllers
│   │
│   ├── frontend/            # React 18 + Vite Web Application
│   │   └── src/features/    # Feature modules (bim, scada, predictions, logistics, etc.)
│   │
│   └── data-platform/       # Medallion Lakehouse pipelines & test suite
│       ├── pipelines/       # Bronze, Silver, and Gold PySpark pipelines
│       ├── contracts/       # Pydantic schema validation contracts
│       └── tests/           # Automated integration test suite
│
└── docs/                    # Architecture documentation & screenshots
    └── screenshots/         # UI interface screenshots
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+
- **Python** 3.11+
- **PostgreSQL** 15+ (Local or Cloud Supabase / Neon instance)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/infrawatch.git
cd infrawatch

# Install dependencies across all workspaces
npm install

# Setup Python virtual environment for Data Platform
cd packages/data-platform
pip install -r requirements.txt
cd ../..
```

### 2. Environment Configuration

Configure your environment variables in `packages/backend/.env`:

```ini
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/infrawatch?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/infrawatch?schema=public"

# Roboflow Computer Vision API
ROBOFLOW_API_KEY="your-roboflow-api-key"
ROBOFLOW_MODEL_ID="coco/3"

# Google Gemini Vision API (Optional for Deep Multi-Modal Reasoning)
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Database Migration & Seed

```bash
# Run database migrations
npm run db:migrate

# Seed demo assets, cameras, inspection footage, and SCADA sensors
npm run db:seed
```

### 4. Running Locally

```bash
# Start both backend API and frontend Vite dev server concurrently
npm run dev
```

- **Frontend Web Suite**: `http://localhost:5173`
- **Backend REST API**: `http://localhost:3000`

---

## 🧪 Testing & Validation

```bash
# Run Data Platform PySpark contracts & sanitization tests
cd packages/data-platform
pytest tests/ -v

# Run Frontend TypeScript validation & Production Build
cd ../frontend
npx tsc --noEmit
npm run build
```

---

## 📄 License

MIT © 2026 InfraWatch Contributors.
