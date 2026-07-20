# Seed Data

> **IEKB Section:** 01 — Database | **Document:** 11-seed-data.md | **Last Updated:** 2026-07-16 | **Status:** Approved

---

## Overview

Seed data provides a consistent, realistic dataset for development and testing. The seeder creates a complete multi-tenant environment with all entity types populated.

---

## Seed Script

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ==================== ORGANIZATIONS ====================
  const orgs = await Promise.all([
    prisma.organization.create({
      data: {
        name: 'TowerNet Communications',
        domain: 'towernet.com',
        plan: 'PROFESSIONAL',
        settings: {
          create: { timezone: 'Asia/Kolkata', notificationConfig: { email: true, slack: true, slack_webhook_url: 'https://hooks.slack.com/services/DEMO/DEMO/DEMO' } },
        },
      },
    }),
    prisma.organization.create({
      data: {
        name: 'SolarPower India',
        domain: 'solarpower.in',
        plan: 'ENTERPRISE',
        settings: { create: { timezone: 'Asia/Kolkata' } },
      },
    }),
    prisma.organization.create({
      data: {
        name: 'BuildFast Construction',
        domain: 'buildfastco.com',
        plan: 'STARTER',
        settings: { create: { timezone: 'Asia/Kolkata' } },
      },
    }),
  ]);

  console.log(`✅ Created ${orgs.length} organizations`);

  // ==================== USERS ====================
  const hashedPassword = await bcrypt.hash('Password@123', 12);

  const users = await Promise.all([
    // TowerNet (org 1)
    prisma.user.create({ data: { tenantId: orgs[0].id, name: 'Rajesh Patel', email: 'rajesh@towernet.com', hashedPassword, role: 'ADMIN' } }),
    prisma.user.create({ data: { tenantId: orgs[0].id, name: 'Priya Sharma', email: 'priya@towernet.com', hashedPassword, role: 'INSPECTOR' } }),
    prisma.user.create({ data: { tenantId: orgs[0].id, name: 'Amit Kumar', email: 'amit@towernet.com', hashedPassword, role: 'MANAGER' } }),
    prisma.user.create({ data: { tenantId: orgs[0].id, name: 'Neha Singh', email: 'neha@towernet.com', hashedPassword, role: 'INSPECTOR' } }),
    prisma.user.create({ data: { tenantId: orgs[0].id, name: 'Vikram Desai', email: 'vikram@towernet.com', hashedPassword, role: 'INSPECTOR' } }),
    // SolarPower (org 2)
    prisma.user.create({ data: { tenantId: orgs[1].id, name: 'Ananya Krishnan', email: 'ananya@solarpower.in', hashedPassword, role: 'ADMIN' } }),
    prisma.user.create({ data: { tenantId: orgs[1].id, name: 'Dev Kapoor', email: 'dev@solarpower.in', hashedPassword, role: 'MANAGER' } }),
    prisma.user.create({ data: { tenantId: orgs[1].id, name: 'Meera Joshi', email: 'meera@solarpower.in', hashedPassword, role: 'INSPECTOR' } }),
    // BuildFast (org 3)
    prisma.user.create({ data: { tenantId: orgs[2].id, name: 'Ravi Reddy', email: 'ravi@buildfastco.com', hashedPassword, role: 'ADMIN' } }),
    prisma.user.create({ data: { tenantId: orgs[2].id, name: 'Sanjay Nair', email: 'sanjay@buildfastco.com', hashedPassword, role: 'INSPECTOR' } }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ==================== ASSET TYPES ====================
  const assetTypes = await Promise.all([
    // TowerNet types
    prisma.assetType.create({ data: { tenantId: orgs[0].id, name: 'Cellular Tower', icon: 'tower', description: 'Mobile network towers and base stations' } }),
    prisma.assetType.create({ data: { tenantId: orgs[0].id, name: 'Fiber Node', icon: 'network', description: 'Fiber optic network distribution nodes' } }),
    prisma.assetType.create({ data: { tenantId: orgs[0].id, name: 'Data Center', icon: 'server', description: 'Data center facilities and server rooms' } }),
    // SolarPower types
    prisma.assetType.create({ data: { tenantId: orgs[1].id, name: 'Solar Panel Array', icon: 'sun', description: 'Photovoltaic panel arrays' } }),
    prisma.assetType.create({ data: { tenantId: orgs[1].id, name: 'Inverter Station', icon: 'zap', description: 'Power inverter stations' } }),
    prisma.assetType.create({ data: { tenantId: orgs[1].id, name: 'Battery Storage', icon: 'battery', description: 'Energy storage systems' } }),
    // BuildFast types
    prisma.assetType.create({ data: { tenantId: orgs[2].id, name: 'Crane', icon: 'crane', description: 'Tower and mobile cranes' } }),
    prisma.assetType.create({ data: { tenantId: orgs[2].id, name: 'Scaffolding', icon: 'layers', description: 'Scaffolding structures' } }),
    prisma.assetType.create({ data: { tenantId: orgs[2].id, name: 'Generator', icon: 'power', description: 'Diesel/electric generators' } }),
  ]);

  console.log(`✅ Created ${assetTypes.length} asset types`);

  // ==================== ASSETS ====================
  const assets = await Promise.all([
    // TowerNet towers
    prisma.asset.create({ data: { tenantId: orgs[0].id, assetTypeId: assetTypes[0].id, createdById: users[0].id, name: 'Tower T-142', description: 'Primary cellular tower serving Connaught Place area', latitude: 28.6139, longitude: 77.2090, address: 'Connaught Place, New Delhi 110001', metadata: { height_meters: 45, manufacturer: 'Ericsson', frequency_bands: ['700MHz', '1800MHz', '2100MHz'], power_backup: true }, status: 'ACTIVE' } }),
    prisma.asset.create({ data: { tenantId: orgs[0].id, assetTypeId: assetTypes[0].id, createdById: users[0].id, name: 'Tower T-205', description: 'Coverage tower for Bandra West residential area', latitude: 19.0596, longitude: 72.8295, address: 'Bandra West, Mumbai 400050', metadata: { height_meters: 38, manufacturer: 'Nokia', frequency_bands: ['800MHz', '1800MHz'], power_backup: true }, status: 'ACTIVE' } }),
    prisma.asset.create({ data: { tenantId: orgs[0].id, assetTypeId: assetTypes[0].id, createdById: users[2].id, name: 'Tower T-089', description: 'High-capacity tower on MG Road', latitude: 12.9716, longitude: 77.5946, address: 'MG Road, Bangalore 560001', metadata: { height_meters: 52, manufacturer: 'Huawei', frequency_bands: ['700MHz', '1800MHz', '2600MHz'], power_backup: false }, status: 'MAINTENANCE' } }),
    prisma.asset.create({ data: { tenantId: orgs[0].id, assetTypeId: assetTypes[1].id, createdById: users[0].id, name: 'Fiber Node FN-12', description: 'Distribution node for Karol Bagh sector', latitude: 28.6519, longitude: 77.1905, address: 'Karol Bagh, New Delhi', metadata: { capacity_gbps: 10, connections: 48 }, status: 'ACTIVE' } }),
    prisma.asset.create({ data: { tenantId: orgs[0].id, assetTypeId: assetTypes[2].id, createdById: users[0].id, name: 'DC-Mumbai-01', description: 'Primary data center, Tier 3 facility', latitude: 19.1136, longitude: 72.8697, address: 'Powai, Mumbai', metadata: { tier: 3, rack_count: 200, power_kw: 500 }, status: 'ACTIVE' } }),
    // SolarPower arrays
    prisma.asset.create({ data: { tenantId: orgs[1].id, assetTypeId: assetTypes[3].id, createdById: users[5].id, name: 'Array SP-001', description: 'Main solar array - Block A', latitude: 26.9124, longitude: 75.7873, address: 'Solar Park, Jaipur, Rajasthan', metadata: { panel_count: 120, capacity_kw: 30, tilt_angle: 25, manufacturer: 'Trina Solar' }, status: 'ACTIVE' } }),
    prisma.asset.create({ data: { tenantId: orgs[1].id, assetTypeId: assetTypes[3].id, createdById: users[5].id, name: 'Array SP-002', description: 'Solar array - Block B', latitude: 26.9200, longitude: 75.7900, address: 'Solar Park Block B, Jaipur', metadata: { panel_count: 150, capacity_kw: 37.5, tilt_angle: 25, manufacturer: 'LONGi Solar' }, status: 'ACTIVE' } }),
    prisma.asset.create({ data: { tenantId: orgs[1].id, assetTypeId: assetTypes[4].id, createdById: users[6].id, name: 'Inverter INV-A1', description: 'Central inverter for Block A', latitude: 26.9150, longitude: 75.7880, address: 'Solar Park Control Room', metadata: { capacity_kw: 100, manufacturer: 'ABB', type: 'Central' }, status: 'ACTIVE' } }),
    // BuildFast equipment
    prisma.asset.create({ data: { tenantId: orgs[2].id, assetTypeId: assetTypes[6].id, createdById: users[8].id, name: 'Crane CR-7', description: 'Tower crane at Sector 45 site', latitude: 28.5355, longitude: 77.3910, address: 'Sector 45, Noida', metadata: { max_load_tons: 8, boom_length_meters: 50, certification_expiry: '2026-12-31' }, status: 'ACTIVE' } }),
    prisma.asset.create({ data: { tenantId: orgs[2].id, assetTypeId: assetTypes[8].id, createdById: users[8].id, name: 'Gen DG-03', description: 'Backup diesel generator', latitude: 28.5360, longitude: 77.3915, address: 'Sector 45, Noida', metadata: { capacity_kva: 500, fuel_type: 'Diesel', run_hours: 1250 }, status: 'ACTIVE' } }),
  ]);

  console.log(`✅ Created ${assets.length} assets`);

  // ==================== CAMERAS ====================
  const cameras = await Promise.all([
    prisma.camera.create({ data: { tenantId: orgs[0].id, assetId: assets[0].id, name: 'Cam-North-T142', cameraType: 'IP', rtspUrl: 'rtsp://192.168.1.101:554/stream1', manufacturer: 'Hikvision', model: 'DS-2CD2143G2', resolution: '4MP', status: 'ACTIVE', installationDate: new Date('2025-01-15') } }),
    prisma.camera.create({ data: { tenantId: orgs[0].id, assetId: assets[0].id, name: 'Cam-South-T142', cameraType: 'PTZ', rtspUrl: 'rtsp://192.168.1.102:554/stream1', manufacturer: 'Dahua', model: 'SD49425XB', resolution: '4MP', status: 'ACTIVE', installationDate: new Date('2025-01-15') } }),
    prisma.camera.create({ data: { tenantId: orgs[0].id, assetId: assets[1].id, name: 'Cam-Entry-T205', cameraType: 'IP', manufacturer: 'Hikvision', resolution: '1080p', status: 'OFFLINE' } }),
    prisma.camera.create({ data: { tenantId: orgs[0].id, assetId: assets[4].id, name: 'DC-Lobby-Cam', cameraType: 'IP', manufacturer: 'Axis', model: 'P3245-V', resolution: '1080p', status: 'ACTIVE' } }),
    prisma.camera.create({ data: { tenantId: orgs[1].id, assetId: assets[5].id, name: 'Thermal-SP001', cameraType: 'THERMAL', manufacturer: 'FLIR', model: 'A700', resolution: '640x480', status: 'ACTIVE' } }),
    prisma.camera.create({ data: { tenantId: orgs[2].id, assetId: assets[8].id, name: 'Site-Cam-01', cameraType: 'IP', manufacturer: 'Hikvision', resolution: '4MP', status: 'ACTIVE' } }),
  ]);

  console.log(`✅ Created ${cameras.length} cameras`);

  // ==================== INSPECTIONS ====================
  const inspections = await Promise.all([
    prisma.inspection.create({ data: { tenantId: orgs[0].id, assetId: assets[0].id, inspectorId: users[1].id, scheduledDate: new Date('2026-07-10'), status: 'COMPLETED', completedAt: new Date('2026-07-10T14:30:00Z'), notes: 'Tower structure intact. Minor rust on base plate at north face. Paint peeling at 15m height mark. Recommend repainting within 3 months. All guy wires tensioned correctly. Foundation bolts tight. Grounding resistance measured at 2.1 ohms (within spec).' } }),
    prisma.inspection.create({ data: { tenantId: orgs[0].id, assetId: assets[1].id, inspectorId: users[3].id, scheduledDate: new Date('2026-07-18'), status: 'SCHEDULED' } }),
    prisma.inspection.create({ data: { tenantId: orgs[0].id, assetId: assets[0].id, inspectorId: users[1].id, scheduledDate: new Date('2026-07-25'), status: 'SCHEDULED' } }),
    prisma.inspection.create({ data: { tenantId: orgs[0].id, assetId: assets[2].id, inspectorId: users[4].id, scheduledDate: new Date('2026-07-20'), status: 'SCHEDULED' } }),
    prisma.inspection.create({ data: { tenantId: orgs[1].id, assetId: assets[5].id, inspectorId: users[7].id, scheduledDate: new Date('2026-07-22'), status: 'SCHEDULED' } }),
    prisma.inspection.create({ data: { tenantId: orgs[1].id, assetId: assets[6].id, inspectorId: users[7].id, scheduledDate: new Date('2026-07-12'), status: 'COMPLETED', completedAt: new Date('2026-07-12T10:00:00Z'), notes: 'All panels in Array SP-002 checked. Panel B3-R12 has minor soiling. Panel B5-R8 has a hairline crack - flagged for detailed review. Overall array output is 96% of rated capacity.' } }),
    prisma.inspection.create({ data: { tenantId: orgs[2].id, assetId: assets[8].id, inspectorId: users[9].id, scheduledDate: new Date('2026-07-19'), status: 'SCHEDULED' } }),
  ]);

  console.log(`✅ Created ${inspections.length} inspections`);

  // ==================== INCIDENTS ====================
  const incidents = await Promise.all([
    prisma.incident.create({ data: { tenantId: orgs[0].id, assetId: assets[0].id, reportedById: users[1].id, title: 'Structural crack on Tower T-142 base plate', description: 'During inspection on July 10, noticed a 2cm crack on the north-facing base plate. Crack appears to have developed recently (not present in April inspection). The crack runs diagonally from the second bolt hole. No immediate structural risk but needs monitoring and repair within 30 days.', severity: 'HIGH', status: 'OPEN', source: 'INSPECTION' } }),
    prisma.incident.create({ data: { tenantId: orgs[0].id, assetId: assets[1].id, reportedById: users[3].id, assignedToId: users[1].id, title: 'Antenna misalignment on Tower T-205', description: 'NOC reported signal degradation in Bandra West coverage area. Visual inspection confirms top antenna array is tilted approximately 5 degrees from vertical. Likely caused by recent storm. Requires crane access for realignment.', severity: 'MEDIUM', status: 'ACKNOWLEDGED', source: 'MANUAL' } }),
    prisma.incident.create({ data: { tenantId: orgs[0].id, assetId: assets[2].id, reportedById: users[2].id, assignedToId: users[1].id, title: 'Generator failure at Tower T-089', description: 'Backup diesel generator failed to start during scheduled load-shedding test at 14:00 IST. Error code E-42 displayed on control panel. Battery voltage reads 11.2V (below 11.5V minimum). Suspect battery failure. Tower currently on grid power only - no backup.', severity: 'CRITICAL', status: 'IN_PROGRESS', source: 'MANUAL' } }),
    prisma.incident.create({ data: { tenantId: orgs[1].id, assetId: assets[5].id, reportedById: users[7].id, title: 'Cracked panel in Array SP-001', description: 'Panel A3-R7 has visible crack after July 8 hailstorm. Crack is approximately 15cm long, running from top-left corner. Panel output reduced by approximately 15%. Adjacent panels appear undamaged. Photos attached.', severity: 'MEDIUM', status: 'OPEN', source: 'INSPECTION' } }),
    prisma.incident.create({ data: { tenantId: orgs[1].id, assetId: assets[6].id, reportedById: users[7].id, title: 'Soiling on Array SP-002 panels', description: 'Multiple panels in rows 3-5 show significant dust accumulation. Estimated 8-10% output reduction. Last cleaning was 6 weeks ago. Recommend scheduling cleaning crew.', severity: 'LOW', status: 'OPEN', source: 'INSPECTION' } }),
    prisma.incident.create({ data: { tenantId: orgs[2].id, assetId: assets[8].id, reportedById: users[9].id, title: 'Crane CR-7 hydraulic leak', description: 'Minor hydraulic fluid leak detected at the base slew ring. Approximately 50ml/hour drip rate. Not affecting operation but needs seal replacement. Hydraulic fluid level still within operating range.', severity: 'MEDIUM', status: 'OPEN', source: 'MANUAL' } }),
  ]);

  // Add comments to incidents
  await prisma.incidentComment.createMany({
    data: [
      { incidentId: incidents[0].id, userId: users[2].id, content: 'Reviewed the photos. This needs structural engineer assessment. Scheduling for next week.' },
      { incidentId: incidents[0].id, userId: users[0].id, content: 'Approved structural engineer visit. Budget allocated from maintenance fund. Please coordinate with Priya for site access.' },
      { incidentId: incidents[2].id, userId: users[1].id, content: 'On site now. Battery is dead - 10.8V under load. Ordering replacement battery. Expected delivery: tomorrow by 2 PM.' },
      { incidentId: incidents[2].id, userId: users[2].id, content: 'This tower serves a hospital zone. Priority 1. Can we arrange temporary mobile generator?' },
    ],
  });

  console.log(`✅ Created ${incidents.length} incidents with comments`);

  // ==================== REPORTS ====================
  await prisma.report.create({
    data: {
      tenantId: orgs[0].id, createdById: users[2].id,
      title: 'Weekly Inspection Report - July W2 2026',
      reportType: 'SUMMARY', startDate: new Date('2026-07-08'), endDate: new Date('2026-07-14'),
      status: 'COMPLETED', fileUrl: 'https://infrawatch-dev.s3.amazonaws.com/reports/1/report-w2-jul-2026.pdf', completedAt: new Date('2026-07-14T18:00:00Z'),
    },
  });

  console.log(`✅ Created 1 report`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

---

## Running the Seeder

```bash
# Run seed
npx prisma db seed

# Or via npm script
npm run db:seed

# Reset and re-seed
npx prisma migrate reset
```

### package.json Configuration

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

---

## Test Credentials

| Organization | Email | Password | Role |
|-------------|-------|----------|------|
| TowerNet | rajesh@towernet.com | Password@123 | ADMIN |
| TowerNet | priya@towernet.com | Password@123 | INSPECTOR |
| TowerNet | amit@towernet.com | Password@123 | MANAGER |
| SolarPower | ananya@solarpower.in | Password@123 | ADMIN |
| SolarPower | dev@solarpower.in | Password@123 | MANAGER |
| BuildFast | ravi@buildfastco.com | Password@123 | ADMIN |

> [!CAUTION]
> These credentials are for **development only**. Never use these passwords in staging or production.

---

## Seed Data Statistics

| Entity | Count | Notes |
|--------|-------|-------|
| Organizations | 3 | One per plan tier (Starter, Professional, Enterprise) |
| Users | 10 | Mix of Admin, Manager, Inspector roles |
| Asset Types | 9 | 3 per organization |
| Assets | 10 | Realistic names, locations, metadata |
| Cameras | 6 | Various types and statuses |
| Inspections | 7 | Mix of completed, scheduled, assigned/unassigned |
| Incidents | 6 | Various severities and statuses with comments |
| Reports | 1 | One completed weekly report |

---

## Related Documents

- **Previous:** [Indexing & Performance](./10-indexing-performance.md)
- **Data Model:** [Data Model Overview](./00-data-model-overview.md)
- **Testing:** [Test Data Factories](../07-testing/09-test-data-factories.md) — Programmatic test data generation
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
