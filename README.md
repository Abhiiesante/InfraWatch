<div align="center">

# 🌐 InfraWatch

### Enterprise Infrastructure & Warehouse Intelligence OS

**Next-Generation Multi-Tenant Digital Twin, SCADA Telemetry & AI-Powered Asset Monitoring**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[Quick Start](#-quick-start) • [Feature Tour](#-product-tour) • [Tech Stack](#-technology-stack) • [Demo Credentials](#-demo-accounts) • [API Documentation](./API.md)

</div>

---

## ⚡ Overview

**InfraWatch** is a production-grade enterprise platform designed for critical infrastructure operators, logistics hubs, and energy grids. It unifies **industrial IoT telemetry**, **SCADA supervisory controls**, **computer vision defect detection**, **14-day predictive maintenance forecasting**, and **3D BIM / GIS Digital Twins** into a single glass pane.

---

## 🚀 Key Capabilities

- **Unified Command Center**: Live KPI bento grid with real-time health score, active telemetry sparklines, and CCTV vision feeds.
- **3D BIM CAD Digital Twin**: Interactive 3D WebGL mesh visualizer with structural stress heatmaps and anchor pier metrics.
- **Industrial SCADA Control**: Sub-second telemetry (voltage, frequency, pressure, RPM) with interactive breaker actuators and threshold alarms.
- **Live IoT Telemetry Engine**: Millisecond-level packet stream analysis, dynamic rule evaluators, and multi-sensor waveform monitoring.
- **Warehouse Logistics & Safety Twin**: Spatial rack capacity heatmaps, AGV & forklift tracking, and OSHA geo-fenced safety zones.
- **AI Computer Vision**: Live WebRTC camera stream ingestion with automated defect detection and PPE compliance tracking.
- **Predictive Maintenance**: 14-day Prophet AI failure risk forecasting, Remaining Useful Life (RUL) curves, and prescriptive maintenance actions.
- **Field Inspections**: End-to-end audit workflows with multi-spectrum optical and thermal capture logging.

---

## 📸 Product Tour

### 1. Command Center Dashboard (`/dashboard`)
Centralized operational cockpit featuring count-up KPIs, real-time telemetry graphs, live CCTV vision stream, and active incident tracking.

![Enterprise Command Center Dashboard](./docs/screenshots/dashboard-command-center.png)

---

### 2. 3D BIM CAD Digital Twin (`/bim-twin`)
Interactive 3D WebGL structural wireframe with live stress heatmaps, anchor pier stress breakdown, and real-time 60 FPS viewport rendering.

![3D BIM CAD Digital Twin Visualizer](./docs/screenshots/digital-twin-bim.png)

---

### 3. Industrial SCADA Supervisory Control (`/scada`)
Real-time substation telemetry monitoring voltage, pipeline pressure, and temperatures with emergency cutoff actuators and alarm envelopes.

![SCADA Supervisory Control Panel](./docs/screenshots/scada-control.png)

---

### 4. Live IoT Telemetry & Sensor Engine (`/telemetry`)
High-frequency sensor packet stream engine with dynamic threshold evaluators and continuous waveform vibration/pressure analysis.

![Live IoT Telemetry Engine](./docs/screenshots/telemetry-iot.png)

---

### 5. Warehouse Logistics & Safety Twin (`/warehouse`)
Interactive floorplan with real-time AGV/forklift tracking, OSHA speed zones, rack utilization heatmaps, and environmental hazard detection.

![Warehouse Logistics Twin](./docs/screenshots/warehouse-logistics.png)

---

### 6. AI Vision & CCTV Stream Center (`/cameras`)
Multi-camera grid with low-latency WebRTC streaming, bounding-box defect overlays, and automated PPE compliance verification.

![AI Vision and Camera Telemetry](./docs/screenshots/ai-vision-cameras.png)

---

### 7. Predictive Maintenance Engine V2.0 (`/predictions`)
Machine learning failure risk forecasting with 14-day lookahead probability curves, overall health indices, and prescriptive work order dispatch.

![Predictive Maintenance Engine](./docs/screenshots/predictive-maintenance.png)

---

### 8. Field Inspections Management (`/inspections`)
Routine audit registry and inspector assignment for solar power parks, transit tunnels, suspension bridges, and hydroelectric dams.

![Field Inspections Registry](./docs/screenshots/bridge-inspection.png)

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Lucide Icons |
| **Backend & APIs** | Node.js 20+, Express.js, TypeScript, Prisma ORM, Socket.io, Zod Validation |
| **Storage & Cache** | PostgreSQL 15 (Multi-Tenant Row Isolation), Redis 7.0 (Pub/Sub & BullMQ Queues) |
| **Intelligence Plane** | Python 3.11, Prophet Time-Series ML, Computer Vision Ingestion, Isolation Forest |
| **DevOps & Containers** | Docker, Docker Compose, Nginx Reverse Proxy, GitHub Actions CI/CD |

---

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/infrawatch.git
cd infrawatch
npm install
```

### 2. Configure Environment

```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

### 3. Initialize Database & Seed Demo Data

```bash
npm run db:migrate
npm run db:seed
```

### 4. Launch Application

```bash
npm run dev
```

- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Demo Accounts

Use these pre-configured accounts after seeding demo data:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Enterprise Admin** | `admin@demo.local` | `Demo@Password123` | Full access to SCADA, Digital Twin, Team RBAC, and System Settings |
| **Operations Manager** | `manager@demo.local` | `Demo@Password123` | Work Orders, Asset Catalog, Inspections, Incident Dispatch |
| **Field Inspector** | `inspector@demo.local` | `Demo@Password123` | Inspection Checklists, Mobile Camera Broadcast, Anomaly Submissions |

---

## 📚 Additional Documentation

- **[REST API Reference](./API.md)** — Complete endpoint definitions, request/response schemas, and auth headers.
- **[Production Deployment Guide](./DEPLOYMENT.md)** — Docker Compose, AWS ECS, and SSL configuration.
- **[Production Checklist](./PRODUCTION_CHECKLIST.md)** — Pre-launch security and reliability audit.

---

<div align="center">

Copyright © 2026 InfraWatch Inc. All rights reserved.

</div>
