<div align="center">

# 🌐 InfraWatch — Enterprise Infrastructure & Warehouse OS

**Next-Generation Multi-Tenant Digital Twin, SCADA Telemetry & AI-Powered Asset Intelligence Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📌 Executive Summary

**InfraWatch** is a production-grade, enterprise-scale operating system designed for mission-critical infrastructure operators, logistics hubs, and energy providers. It unites **industrial IoT telemetry**, **real-time SCADA supervisory controls**, **computer vision defect detection**, **14-day predictive maintenance forecasting**, and **3D BIM / GIS Digital Twins** into a unified pane of glass.

Built with a modern monorepo architecture, InfraWatch provides strict multi-tenant database isolation, sub-second telemetry streaming, automated background workers, and an analytical lakehouse intelligence plane.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer"]
        UI["React 18 + Vite Web App<br/>Tailwind CSS & Framer Motion"]
        CamTx["WebRTC / RTSP Camera Transmitter"]
    end

    subgraph ControlPlane ["Control Plane (Backend & Ingestion)"]
        API["Node.js / Express.js REST API<br/>JWT Auth & RBAC Validation"]
        SocketIO["Socket.io Realtime Telemetry Server"]
        AuthMW["Multi-Tenant Isolation Middleware"]
    end

    subgraph StorageQueues ["Storage & Queues"]
        PG[("PostgreSQL Database<br/>Prisma ORM Multi-Tenant")]
        Redis[("Redis 7.0<br/>Cache & Pub/Sub")]
        BullMQ["BullMQ Job Queue<br/>Workers & Alerts"]
    end

    subgraph IntelligencePlane ["Intelligence Plane (Data Platform)"]
        Bronze["Bronze Ingestion Lake"]
        Silver["Silver Quality & Deduplication"]
        Gold["Gold Aggregation & Metrics Sync"]
        ML["ML & Anomaly Engine<br/>Isolation Forest + Defect Classifier"]
    end

    UI -->|"HTTPS / REST API"| API
    UI -->|"WebSocket (WSS)"| SocketIO
    CamTx -->|"WebRTC / HLS Stream"| API
    API --> AuthMW
    AuthMW --> PG
    API --> Redis
    API --> BullMQ
    BullMQ --> Redis
    PG -->|"Data Lake Sync"| Gold
    Gold --> ML
    ML -->|"Inference Telemetry"| API
```

---

## 🖥️ Platform Modules & UI Showcase

InfraWatch features a rich suite of specialized operational interfaces designed with high visual fidelity, glassmorphism aesthetics, dynamic dark mode, and smooth micro-animations.

### 1. 🌌 Cinematic Hero Landing Page (`/`)
* **Live Rotating Photography**: Seamless cross-fades between high-resolution curated infrastructure photography (wind farms, solar arrays, power grids, industrial plants).
* **Direct Access Portal**: Quick authentication routing and enterprise organization onboarding.
* **Minimalist Aesthetic**: High-contrast typography with teal/emerald glowing gradients.

```
+-------------------------------------------------------------------------+
|  [ Enterprise Infrastructure OS ]                                      |
|                                                                         |
|                     See deeper.                                         |
|                     Act faster.                                         |
|                                                                         |
|   The world's most advanced digital twin platform. Merging SCADA        |
|   telemetry, AI anomaly detection, and 3D BIM into one glass pane.      |
|                                                                         |
|              [ Enter Platform -> ]   [ Create Account ]                 |
+-------------------------------------------------------------------------+
```

---

### 2. 📊 Enterprise Command Center Dashboard (`/dashboard`)
* **Real-time KPI Bento Grid**: Animated count-up metrics for System Health Score, Active Critical Incidents, Inspected Assets, and Sensor Uptime.
* **Live Telemetry Stream**: Interactive Sparkline and Multi-axis telemetry graphs updating in real time via WebSockets.
* **Live CCTV Vision Feeds**: Direct camera stream thumbnails with active AI detection status overlays.
* **Recent Anomaly Stream**: Chronological alerts with severity tagging (Critical, High, Medium, Low).

![Enterprise Command Center Dashboard](./docs/screenshots/dashboard-command-center.png)

---

### 3. ⚡ Industrial SCADA Control Panel (`/scada`)
* **Sub-Second Telemetry Monitoring**: Real-time voltage, pipeline pressure, turbine RPM, transformer temperatures, and flow rates.
* **Interactive Actuator Controls**: Remote toggle valves, emergency cutoff breakers, and cooling fan setpoints with safety confirmation dialogs.
* **Threshold Alarming**: Dynamic visual alarms when telemetry breaches configured safety envelopes.

![SCADA Supervisory Control](./docs/screenshots/scada-control.png)

---

### 4. 🏭 Warehouse Logistics & Safety Twin (`/warehouse`)
* **Spatial Rack & Bay Capacity**: Live capacity utilization heatmaps across storage aisles.
* **Automated Guided Vehicle (AGV) Tracking**: Real-time 2D floor plan positions for forklifts, autonomous mobile robots (AMRs), and personnel.
* **OSHA Safety Zone Enforcement**: Automated geo-fencing with speed reduction zones and collision hazard warnings.
* **Environmental Sensors**: Humidity, ambient temperature, air quality (VOC), and hazardous gas monitoring.

![Warehouse Logistics Twin](./docs/screenshots/warehouse-logistics.png)

---

### 5. 🎥 AI Vision & CCTV Stream Center (`/cameras`, `/cam-broadcast`)
* **Multi-Camera Grid**: Low-latency HLS and WebRTC camera feeds from perimeter, facility, and drone streams.
* **Computer Vision Defect Ingestion**: Live object detection bounding boxes for PPE compliance, structural crack propagation, and thermal hotspots.
* **WebRTC Broadcaster (`/cam-broadcast`)**: Turn any mobile device or field tablet into a live streaming inspection camera.

![AI Vision and Camera Telemetry](./docs/screenshots/ai-vision-cameras.png)

---

### 6. 🔮 Neural Prophet 14-Day Predictive Maintenance (`/predictions`)
* **Remaining Useful Life (RUL)**: Machine learning curve estimating degradation trajectories.
* **Failure Probability Matrix**: 14-day lookahead forecasting probability of bearing failure, transformer overload, or pipe rupture.
* **Prescriptive Actions**: Automated recommendation generator with estimated downtime cost avoidance.

![Predictive Maintenance Analytics](./docs/screenshots/predictive-maintenance.png)

---

### 7. 🗺️ 3D GIS Digital Twin & BIM Spatial Viewer (`/map`, `/bim-twin`)
* **Mapbox / Leaflet GIS Integration**: Interactive global map plotting multi-tier infrastructure assets with clustering and status color codes.
* **3D BIM Structural Viewer**: Interactive 3D building/infrastructure mesh visualization with layer toggles (structural, electrical, mechanical).
* **Weather & Environmental Overlay**: Satellite live wind vectors, precipitation radar, and seismic activity maps.

![3D BIM & Digital Twin](./docs/screenshots/digital-twin-bim.png)

---

### 8. 🔍 Field Inspections & Thermal Anomaly Analysis (`/inspections`)
* **Multi-Spectrum Capture**: Side-by-side high-resolution optical and thermal infrared inspection analysis.
* **Autonomous Defect Classification**: Automated tagging of rust corrosion indices, weld fatigue, and concrete delamination.

![Thermal Inspection Analysis](./docs/screenshots/bridge-inspection.png)

---

### 9. 📡 Real-Time IoT & High-Frequency Telemetry (`/telemetry`)
* **Sub-Second Sensor Ingestion**: Millisecond-level frequency tracking, vibration harmonics, and multi-sensor correlation matrices.
* **Edge-to-Cloud Sync**: Distributed buffer with automated backpressure handling and offline replay.

![High Frequency Telemetry](./docs/screenshots/telemetry-iot.png)

---

## 📦 Monorepo Package Breakdown

```
IEKB/
├── packages/
│   ├── frontend/               # React 18 + Vite + Tailwind CSS SPA
│   │   ├── src/
│   │   │   ├── features/       # Modular feature domains (dashboard, scada, etc.)
│   │   │   ├── components/     # Shared design system components & ProtectedRoute
│   │   │   ├── lib/            # API client, image registry, hooks, utilities
│   │   │   └── store/          # Zustand global stores (auth, telemetry, ui)
│   │   └── package.json
│   │
│   ├── backend/                # Node.js + Express REST & Socket.io Server
│   │   ├── src/
│   │   │   ├── routes/         # Express REST API route handlers
│   │   │   ├── services/       # Business logic & data access services
│   │   │   ├── middleware/     # Auth, Tenant isolation, Error handlers
│   │   │   └── db/             # Prisma schema, migrations, seeders
│   │   └── package.json
│   │
│   ├── workers/                # BullMQ Background Processing Service
│   │   ├── src/                # Report generation, thumbnailing, notification workers
│   │   └── package.json
│   │
│   ├── data-platform/          # Python Lakehouse & ML Intelligence Plane
│   │   ├── ingestion/          # Auto Loader & batch ingestion
│   │   ├── pipelines/          # Bronze, Silver, Gold data transformations
│   │   ├── ml/                 # Anomaly detection & predictive maintenance models
│   │   ├── llm/                # RAG knowledge base & incident reasoning
│   │   └── pyproject.toml
│   │
│   └── shared/                 # Shared TypeScript interfaces & DTO contracts
│
├── docker-compose.dev.yml      # Local development container orchestration
├── docker-compose.prod.yml     # Production multi-container deployment
├── API.md                      # Detailed REST API endpoint specification
├── DEPLOYMENT.md               # Cloud & Bare-Metal production setup guide
└── README.md                   # Project documentation index
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Node.js**: v20.x or higher
* **npm**: v9.x or higher
* **PostgreSQL**: v14+ (or Docker)
* **Redis**: v6+ (or Docker)
* **Python**: v3.11+ (optional, for analytical data platform)

---

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/infrawatch.git
cd infrawatch

# Install monorepo dependencies across all packages
npm install
```

---

### Step 2: Environment Configuration

```bash
# Backend Environment
cp packages/backend/.env.example packages/backend/.env

# Frontend Environment
cp packages/frontend/.env.example packages/frontend/.env

# Workers Environment
cp packages/workers/.env.example packages/workers/.env
```

Ensure `packages/backend/.env` has valid PostgreSQL & Redis credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/infrawatch?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="super-secret-jwt-refresh-key"
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

---

### Step 3: Database Migration & Seeding

```bash
# Run database migrations
npm run db:migrate

# Seed sample infrastructure data, demo users, and assets
npm run db:seed
```

---

### Step 4: Run the Full Stack

```bash
# Start all packages in development mode concurrently
npm run dev
```

* **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
* **Backend REST API**: [http://localhost:3000](http://localhost:3000)
* **API Health Check**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## 🔑 Demo Access Credentials

The database seed provides pre-configured multi-tenant user accounts:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Enterprise Admin** | `admin@demo.local` | `Demo@Password123` | Full access to SCADA, Digital Twin, Team RBAC, and System Settings |
| **Operations Manager** | `manager@demo.local` | `Demo@Password123` | Work Orders, Asset Management, Inspections, Incident Dispatch |
| **Field Inspector** | `inspector@demo.local` | `Demo@Password123` | Inspection Checklists, Mobile Camera Broadcast, Anomaly Submissions |

---

## 📡 REST API Summary (Key Endpoints)

| Method | Endpoint | Description | Role |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticate and obtain Access & Refresh JWTs | Public |
| `POST` | `/api/auth/register` | Register new organization tenant & root administrator | Public |
| `GET` | `/api/organizations/current/stats` | Organization KPI summary, active asset count, incident status | All |
| `GET` | `/api/assets` | Paginated asset catalog with geolocation, type, and health | All |
| `POST` | `/api/assets` | Create new infrastructure asset | Admin, Manager |
| `GET` | `/api/telemetry/live/:assetId` | Real-time sensor telemetry time series | All |
| `GET` | `/api/scada/metrics` | Real-time SCADA telemetry for industrial control view | All |
| `POST` | `/api/scada/actuate` | Execute actuator command or breaker trip | Admin |
| `GET` | `/api/predictions/health-score` | Neural network overall health index & failure probabilities | All |
| `GET` | `/api/anomalies` | Computer vision defect and anomaly list | All |
| `GET` | `/api/cameras` | Registered RTSP / WebRTC camera streams | All |
| `POST` | `/api/incidents` | Report a new operational incident | All |
| `POST` | `/api/incidents/:id/assign` | Assign incident to an engineer or operator | Admin, Manager |
| `GET` | `/api/drone-fleet/status` | Real-time autonomous drone telemetry & active missions | All |
| `GET` | `/api/warehouse/inventory` | Warehouse rack capacity, AGV coordinates, and OSHA status | All |

*For complete schema specifications and request/response payloads, refer to [API.md](./API.md).*

---

## 🧪 Testing & Verification

```bash
# Run unit & integration tests across all packages
npm run test

# Run tests in watch mode
npm run test -- --watch

# Type check all TypeScript files
npm run type-check

# Run ESLint across monorepo
npm run lint

# Run Python Data Platform tests
cd packages/data-platform && pytest tests/ -v
```

---

## 🐳 Docker Deployment

### Local Multi-Container Development

```bash
# Spin up PostgreSQL, Redis, Backend, Frontend, and Workers
docker-compose -f docker-compose.dev.yml up -d --build

# View real-time logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production Deployment

```bash
# Start production containers with Nginx reverse proxy
docker-compose -f docker-compose.prod.yml up -d --build
```

*For comprehensive AWS ECS, Kubernetes, and bare-metal production architectures, see [DEPLOYMENT.md](./DEPLOYMENT.md).*

---

## 🛡️ Security & Compliance Standards

* **Multi-Tenant Isolation**: Row-Level Security (RLS) and Prisma middleware guarantee zero cross-tenant data leakage.
* **Cryptographic Security**: Passwords hashed with `bcryptjs` (12 salt rounds); JWT token validation with distinct Access & Refresh secrets.
* **Transport Security**: TLS 1.3 encryption for WebSockets (`wss://`) and WebRTC streams.
* **Compliance Frameworks**: Built-in support for **ISO 55001** (Asset Management Systems) and **OSHA 1910** (General Industry Safety Standards).

---

## 📄 License & Attribution

Copyright © 2026 InfraWatch Inc. All rights reserved.
Proprietary enterprise software. Built for high-reliability infrastructure monitoring and operations.
