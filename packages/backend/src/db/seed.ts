import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';

const rawDbUrl = process.env.DATABASE_URL || '';
const dbUrl = rawDbUrl.includes('?') ? `${rawDbUrl}&connection_limit=1` : `${rawDbUrl}?connection_limit=1`;
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function seed() {
  console.log('🌱 Resetting and seeding database with 10 demo infrastructure facilities...');

  // Clean up existing data in correct dependency order
  await prisma.incidentComment.deleteMany({});
  await prisma.incidentAssignment.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.inspectionImage.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.telemetryReading.deleteMany({});
  await prisma.sensorRule.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.assetPrediction.deleteMany({});
  await prisma.camera.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.assetType.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'InfraWatch Global Engineering Operations',
      domain: 'infrawatch.io',
      plan: 'ENTERPRISE',
      isActive: true,
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  const hashedPassword = await bcrypt.hash('Demo@Password123', 12);

  const adminUser = await prisma.user.create({
    data: {
      tenantId: org.id,
      name: 'Dr. Rajesh Sharma (Chief Infrastructure Officer)',
      email: 'admin@demo.local',
      hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: org.id,
      name: 'Priya Patel (Grid Operations Manager)',
      email: 'manager@demo.local',
      hashedPassword,
      role: 'MANAGER',
      isActive: true,
    },
  });

  const inspectorUser = await prisma.user.create({
    data: {
      tenantId: org.id,
      name: 'Aarav Kumar (Lead Robotics Inspector)',
      email: 'inspector@demo.local',
      hashedPassword,
      role: 'INSPECTOR',
      isActive: true,
    },
  });

  console.log(`✅ Users created: ${adminUser.email}`);

  // Create Asset Types
  const fusionType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Fusion & High-Energy Physics Complex',
      description: 'Nuclear fusion tokamak reactors, particle accelerator rings, and cryogenic vacuum vessels',
      icon: 'zap',
      isActive: true,
    },
  });

  const bridgeType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Cable-Stayed & Arch Structural Mega Bridge',
      description: 'High-span railway arch bridges, marine cable-stayed links, and suspension corridors',
      icon: 'bridge',
      isActive: true,
    },
  });

  const hydroType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Hydroelectric Power Dam & Lock Complex',
      description: 'Ultra-scale hydroelectric dams, spillways, Francis turbines, and reservoir barriers',
      icon: 'droplet',
      isActive: true,
    },
  });

  const tunnelType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Deep Subsurface Transit Tunnel',
      description: 'Deep-overburden high-speed rail tubes and underwater transit conduits',
      icon: 'layers',
      isActive: true,
    },
  });

  const windType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Offshore Wind Energy Farm',
      description: 'Deep-sea monopile & jacket offshore wind turbine arrays',
      icon: 'wind',
      isActive: true,
    },
  });

  const solarType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Photovoltaic Mega Solar Park',
      description: 'Multi-gigawatt tracker-based solar panel arrays and sub-stations',
      icon: 'sun',
      isActive: true,
    },
  });

  // ===================================================================
  // 10 Demo Infrastructure Facilities
  //
  // These are FICTIONAL facilities with realistic-sounding names.
  // They are NOT real infrastructure and do not represent or imply
  // any monitoring relationship with any real-world operator.
  // ===================================================================

  const asset1 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: fusionType.id,
      createdById: adminUser.id,
      name: 'Meridian Fusion Research Reactor & Cryostat Complex',
      description: 'Magnetic confinement plasma tokamak reactor core with 18 superconducting toroidal field D-coils, central solenoid core, and cryostat containment shielding',
      latitude: new Decimal('43.6888'),
      longitude: new Decimal('5.7661'),
      address: 'Meridian Research Campus, Route de la Fusion, Provence-Alpes, France',
      status: 'ACTIVE',
      healthScore: 99,
      metadata: {
        bimType: 'TOKAMAK_FUSION_REACTOR',
        elementCount: 84920,
        plasmaTempMillionC: 150,
        magneticFieldTesla: 11.8,
        operationalStatus: 'SUPERCONDUCTING_MAGNETS_NOMINAL',
      },
    },
  });

  const asset2 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: fusionType.id,
      createdById: adminUser.id,
      name: 'Axion Particle Accelerator Ring & Cavern Complex',
      description: '27-kilometer superconducting particle accelerator ring and experimental detector cavern',
      latitude: new Decimal('46.2330'),
      longitude: new Decimal('6.0557'),
      address: 'Axion Physics Laboratory, Chemin des Particules, Canton de Genève, Switzerland',
      status: 'ACTIVE',
      healthScore: 98,
      metadata: {
        ringLengthKm: 27,
        collisionEnergyTeV: 13.6,
        cryoTempKelvin: 1.9,
        operationalStatus: 'BEAM_CIRCULATING',
      },
    },
  });

  const asset3 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: bridgeType.id,
      createdById: adminUser.id,
      name: 'Kamala Valley High-Altitude Railway Arch Bridge',
      description: 'Steel arch railway bridge spanning 359 meters above a mountain river valley',
      latitude: new Decimal('33.1492'),
      longitude: new Decimal('74.8824'),
      address: 'Kamala Valley Rail Corridor, Highland District, Northern Region',
      status: 'ACTIVE',
      healthScore: 96,
      metadata: {
        heightAboveRiverbedM: 359,
        lengthMeters: 1315,
        windResistanceKmH: 266,
        operationalStatus: 'FULLY_OPERATIONAL',
      },
    },
  });

  const asset4 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: bridgeType.id,
      createdById: adminUser.id,
      name: 'Westshore Bay Cable-Stayed Marine Link',
      description: '5.6 km 8-lane cable-stayed bridge spanning a coastal bay',
      latitude: new Decimal('19.0330'),
      longitude: new Decimal('72.8185'),
      address: 'Westshore Bay Link Road, Coastal Metro District',
      status: 'ACTIVE',
      healthScore: 94,
      metadata: {
        lengthKm: 5.6,
        trafficLanes: 8,
        steelCableLengthKm: 37500,
        operationalStatus: 'OPTIMAL',
      },
    },
  });

  const asset5 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: hydroType.id,
      createdById: adminUser.id,
      name: 'Longshan Hydroelectric Power Dam & Lock Complex',
      description: '22,500 MW hydroelectric gravity dam spanning a major continental river',
      latitude: new Decimal('30.8242'),
      longitude: new Decimal('111.0028'),
      address: 'Longshan Dam Authority, Gorge District, Central Province',
      status: 'ACTIVE',
      healthScore: 97,
      metadata: {
        capacityMW: 22500,
        damHeightM: 185,
        reservoirCapacityBillionM3: 39.3,
        operationalStatus: 'MAXIMUM_POWER_GENERATION',
      },
    },
  });

  const asset6 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: tunnelType.id,
      createdById: adminUser.id,
      name: 'Albion Deep-Core Transit Tunnel',
      description: '57.1 km twin single-track high-speed rail tunnel under an alpine mountain range',
      latitude: new Decimal('46.5458'),
      longitude: new Decimal('8.7186'),
      address: 'Albion Tunnel Authority, Alpine Transit Corridor, Switzerland',
      status: 'ACTIVE',
      healthScore: 95,
      metadata: {
        lengthKm: 57.09,
        maxDepthMeters: 2450,
        dailyTrains: 260,
        operationalStatus: 'NOMINAL',
      },
    },
  });

  const asset7 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: bridgeType.id,
      createdById: adminUser.id,
      name: 'Naruto Strait Suspension Bridge',
      description: 'Dual-deck suspension bridge with a central span of 1,991 meters across a major shipping strait',
      latitude: new Decimal('34.6167'),
      longitude: new Decimal('135.0219'),
      address: 'Naruto Strait Crossing Authority, Hyogo Prefecture, Japan',
      status: 'ACTIVE',
      healthScore: 93,
      metadata: {
        mainSpanMeters: 1991,
        towerHeightM: 298.3,
        seismicRating: '8.5_RICHTER',
        operationalStatus: 'OPERATIONAL',
      },
    },
  });

  const asset8 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: hydroType.id,
      createdById: adminUser.id,
      name: 'Redrock Canyon Hydroelectric Dam & Reservoir',
      description: '2,080 MW concrete arch-gravity dam impounding a major reservoir on a desert river',
      latitude: new Decimal('36.0156'),
      longitude: new Decimal('-114.7378'),
      address: 'Redrock Canyon Dam Authority, Clark County, Nevada, USA',
      status: 'ACTIVE',
      healthScore: 91,
      metadata: {
        capacityMW: 2080,
        heightM: 221.4,
        turbinesCount: 17,
        operationalStatus: 'NOMINAL',
      },
    },
  });

  const asset9 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: windType.id,
      createdById: adminUser.id,
      name: 'Northsea Array Offshore Wind Energy Farm',
      description: '1.32 GW offshore wind power facility with 165 turbines in the North Sea',
      latitude: new Decimal('53.8860'),
      longitude: new Decimal('1.8540'),
      address: 'Northsea Array Operations, 89 km off the Yorkshire Coast, United Kingdom',
      status: 'ACTIVE',
      healthScore: 96,
      metadata: {
        capacityGW: 1.32,
        turbinesCount: 165,
        offshoreDistanceKm: 89,
        operationalStatus: 'MAXIMUM_OUTPUT',
      },
    },
  });

  const asset10 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: solarType.id,
      createdById: adminUser.id,
      name: 'Suryanagar Ultra Mega Solar Power Park',
      description: '2,245 MW total capacity solar park covering 14,000 acres in the Thar Desert region',
      latitude: new Decimal('27.5398'),
      longitude: new Decimal('71.9152'),
      address: 'Suryanagar Solar Authority, Jodhpur District, Rajasthan, India',
      status: 'ACTIVE',
      healthScore: 98,
      metadata: {
        capacityMW: 2245,
        areaAcres: 14000,
        solarPanelsMillion: 4.5,
        operationalStatus: 'PEAK_GENERATION',
      },
    },
  });

  console.log(`✅ 10 Demo Infrastructure Facilities Created in Database`);

  // Create 10 Cameras (1 per Asset) with sample video streams
  const assets = [asset1, asset2, asset3, asset4, asset5, asset6, asset7, asset8, asset9, asset10];
  const videoUrls = [
    'https://media.roboflow.com/supervision/video-examples/store-aisle.mp4',
    'https://media.roboflow.com/supervision/video-examples/vehicles.mp4',
    'https://media.roboflow.com/supervision/video-examples/people-walking.mp4',
    'https://media.roboflow.com/supervision/video-examples/store-aisle.mp4',
    'https://media.roboflow.com/supervision/video-examples/vehicles.mp4',
    'https://media.roboflow.com/supervision/video-examples/people-walking.mp4',
    'https://media.roboflow.com/supervision/video-examples/store-aisle.mp4',
    'https://media.roboflow.com/supervision/video-examples/vehicles.mp4',
    'https://media.roboflow.com/supervision/video-examples/people-walking.mp4',
    'https://media.roboflow.com/supervision/video-examples/store-aisle.mp4',
  ];

  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    await prisma.camera.create({
      data: {
        tenantId: org.id,
        assetId: a.id,
        name: `${a.name.split(' ')[0]} Monitoring Camera ${i + 1}`,
        cameraType: i % 2 === 0 ? '360° DOME PTZ' : 'OPTICAL 4K STRUCTURAL',
        rtspUrl: `rtsp://cam-${a.id}.infrawatch.io/live`,
        ipAddress: `10.205.30.${100 + i}`,
        status: 'ONLINE',
        config: {
          resolution: '3840x2160',
          fps: 60,
          streamUrl: videoUrls[i],
          recordingEnabled: true,
        },
      },
    });
  }

  console.log(`✅ 10 Cameras Created & Linked`);

  // Create Scheduled Inspections (For Drone Missions)
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    await prisma.inspection.create({
      data: {
        tenantId: org.id,
        assetId: a.id,
        inspectorId: inspectorUser.id,
        scheduledDate: new Date(Date.now() + (i + 1) * 3600000 * 4),
        status: i === 0 ? 'IN_PROGRESS' : (i < 4 ? 'SCHEDULED' : 'COMPLETED'),
        notes: `Autonomous robotic flight path inspection for ${a.name}`,
        isPredictive: true,
      },
    });
  }

  console.log(`✅ Scheduled Autonomous Inspections Created`);

  // Create Sensor Rules for IoT Threshold Engine
  await prisma.sensorRule.createMany({
    data: [
      { tenantId: org.id, assetId: asset1.id, sensorType: 'TEMPERATURE', minThreshold: new Decimal(10), maxThreshold: new Decimal(85), action: 'ALERT', isActive: true },
      { tenantId: org.id, assetId: asset3.id, sensorType: 'VIBRATION', minThreshold: new Decimal(0), maxThreshold: new Decimal(5), action: 'ALERT', isActive: true },
      { tenantId: org.id, assetId: asset4.id, sensorType: 'VOLTAGE', minThreshold: new Decimal(360), maxThreshold: new Decimal(440), action: 'TRIP', isActive: true },
      { tenantId: org.id, assetId: asset5.id, sensorType: 'AMPERAGE', minThreshold: new Decimal(100), maxThreshold: new Decimal(4000), action: 'WARN', isActive: true },
    ],
  });

  console.log(`✅ Active Sensor Threshold Rules Created`);

  // Create Digital Work Orders across SLA states
  await prisma.workOrder.createMany({
    data: [
      {
        tenantId: org.id,
        assetId: asset1.id,
        assignedToId: inspectorUser.id,
        title: 'Calibrate Meridian Reactor Cryostat Vacuum Pressure Transducer',
        description: 'Perform routine quarterly calibration on sensor array CH-04 and verify helium leak tightness.',
        priority: 'CRITICAL',
        status: 'PENDING',
        slaDeadline: new Date(Date.now() + 4 * 3600000),
      },
      {
        tenantId: org.id,
        assetId: asset3.id,
        assignedToId: inspectorUser.id,
        title: 'Inspect Kamala Valley Arch Bridge Pier Bolt Tension & Structural Heatmap',
        description: 'Verify high-torque anchor bolt pre-load using ultrasound gauge on approach span.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(Date.now() + 8 * 3600000),
      },
      {
        tenantId: org.id,
        assetId: asset4.id,
        assignedToId: adminUser.id,
        title: 'Replace Emergency Cooling Intake Pump Mechanical Seal #2',
        description: 'Replace degraded nitrile O-ring on high-pressure seawater pump impeller casing.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(Date.now() + 12 * 3600000),
      },
      {
        tenantId: org.id,
        assetId: asset8.id,
        assignedToId: inspectorUser.id,
        title: 'Perform Vibrational Frequency Sweep on Redrock Dam Turbine #12',
        description: 'Acoustic spectrum analysis on Francis turbine bearing housing to isolate shaft whip anomaly.',
        priority: 'MEDIUM',
        status: 'PENDING',
        slaDeadline: new Date(Date.now() + 24 * 3600000),
      },
      {
        tenantId: org.id,
        assetId: asset9.id,
        assignedToId: adminUser.id,
        title: 'Routine Nacelle Yaw Drive Lubrication on Northsea Array Turbine #44',
        description: 'Completed semi-annual synthetic lubricant flush and gear teeth inspection.',
        priority: 'MEDIUM',
        status: 'COMPLETED',
        slaDeadline: new Date(Date.now() - 24 * 3600000),
        completedAt: new Date(Date.now() - 12 * 3600000),
        signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50"><text x="10" y="35" font-family="cursive" font-size="24" fill="white">Aarav Kumar</text></svg>',
      },
    ],
  });

  console.log(`✅ Digital Work Orders Created`);

  // Create Historical Telemetry Readings using batch createMany
  const sensorTypes = ['VIBRATION', 'TEMPERATURE', 'AMPERAGE', 'FREQUENCY', 'VOLTAGE'];
  const now = Date.now();
  const readingsToInsert: any[] = [];

  for (const a of assets) {
    for (const sensor of sensorTypes) {
      for (let step = 0; step < 15; step++) {
        const time = new Date(now - (14 - step) * 15000);
        let baseVal = 20;
        if (sensor === 'VIBRATION') baseVal = 2.14;
        if (sensor === 'TEMPERATURE') baseVal = 42.5;
        if (sensor === 'AMPERAGE') baseVal = 84.2;
        if (sensor === 'FREQUENCY') baseVal = 68.2;
        if (sensor === 'VOLTAGE') baseVal = 400.2;

        const wave = Math.sin((time.getTime() + a.id * 1000) / 10000) * (baseVal * 0.1);
        const val = +(baseVal + wave).toFixed(2);

        readingsToInsert.push({
          tenantId: org.id,
          assetId: a.id,
          sensorType: sensor,
          value: new Decimal(val),
          unit: sensor === 'VIBRATION' ? 'mm/s' : (sensor === 'TEMPERATURE' ? '°C' : (sensor === 'FREQUENCY' ? 'dB' : '%')),
          isAnomaly: val > baseVal * 1.2,
          timestamp: time,
        });
      }
    }
  }

  await prisma.telemetryReading.createMany({ data: readingsToInsert });

  console.log(`✅ Time-Series Telemetry Readings Seeded for all Assets`);
  console.log('🚀 Database Seeding Complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
