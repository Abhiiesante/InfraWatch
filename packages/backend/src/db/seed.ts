import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.incidentComment.deleteMany({});
  await prisma.incidentAssignment.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.inspectionImage.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.camera.deleteMany({});
  await prisma.asset.deleteMany({});
  await prisma.assetType.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});

  // Create demo organization
  const org = await prisma.organization.create({
    data: {
      name: 'Demo Tower Company',
      domain: 'demo.infrawatch.local',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // Create demo users
  const hashedPassword = await bcrypt.hash('Demo@Password123', 12);

  const adminUser = await prisma.user.create({
    data: {
      tenantId: org.id,
      name: 'Admin User',
      email: 'admin@demo.local',
      hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      tenantId: org.id,
      name: 'John Manager',
      email: 'manager@demo.local',
      hashedPassword,
      role: 'MANAGER',
      isActive: true,
    },
  });

  const inspectorUser = await prisma.user.create({
    data: {
      tenantId: org.id,
      name: 'Alice Inspector',
      email: 'inspector@demo.local',
      hashedPassword,
      role: 'INSPECTOR',
      isActive: true,
    },
  });

  console.log(`✅ Users created: ${adminUser.email}, ${managerUser.email}, ${inspectorUser.email}`);

  // Create demo asset types
  const towerType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Communication Tower',
      description: 'Cellular and communication towers',
      icon: 'tower',
      isActive: true,
    },
  });

  const panelType = await prisma.assetType.create({
    data: {
      tenantId: org.id,
      name: 'Solar Panel Array',
      description: 'Solar power generation panels',
      icon: 'sun',
      isActive: true,
    },
  });

  console.log(`✅ Asset types created: ${towerType.name}, ${panelType.name}`);

  // Create demo assets
  const tower1 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: towerType.id,
      createdById: adminUser.id,
      name: 'Tower Alpha-01',
      description: 'Primary communication tower in sector 1',
      latitude: new Decimal('40.7128'),
      longitude: new Decimal('-74.0060'),
      address: '123 Tech Avenue, New York, NY 10001',
      status: 'ACTIVE',
      metadata: {
        height: 150,
        installDate: '2023-01-15',
        manufacturer: 'Tower Solutions Inc',
        lastMaintenance: '2026-06-01',
      },
    },
  });

  const tower2 = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: towerType.id,
      createdById: adminUser.id,
      name: 'Tower Beta-02',
      description: 'Secondary communication tower in sector 2',
      latitude: new Decimal('40.7580'),
      longitude: new Decimal('-73.9855'),
      address: '456 Innovation Drive, New York, NY 10002',
      status: 'ACTIVE',
      metadata: {
        height: 120,
        installDate: '2022-08-20',
        manufacturer: 'Global Tower Corp',
        lastMaintenance: '2026-05-15',
      },
    },
  });

  const solarFarm = await prisma.asset.create({
    data: {
      tenantId: org.id,
      assetTypeId: panelType.id,
      createdById: adminUser.id,
      name: 'Solar Farm A',
      description: 'Large-scale solar panel array',
      latitude: new Decimal('40.7489'),
      longitude: new Decimal('-73.9680'),
      address: '789 Green Energy Blvd, New York, NY 10003',
      status: 'ACTIVE',
      metadata: {
        capacity: 5000,
        panels: 1200,
        installDate: '2023-03-10',
        manufacturer: 'SunPower',
      },
    },
  });

  console.log(`✅ Assets created: ${tower1.name}, ${tower2.name}, ${solarFarm.name}`);

  // Create demo cameras
  const camera1 = await prisma.camera.create({
    data: {
      tenantId: org.id,
      assetId: tower1.id,
      name: 'Camera - Tower Alpha Main',
      cameraType: 'PTZ HD',
      rtspUrl: 'rtsp://camera1.local/stream',
      ipAddress: '192.168.1.100',
      status: 'ONLINE',
      config: {
        resolution: '1920x1080',
        fps: 30,
        recordingEnabled: true,
      },
    },
  });

  const camera2 = await prisma.camera.create({
    data: {
      tenantId: org.id,
      assetId: tower2.id,
      name: 'Camera - Tower Beta Main',
      cameraType: 'Fixed HD',
      rtspUrl: 'rtsp://camera2.local/stream',
      ipAddress: '192.168.1.101',
      status: 'ONLINE',
      config: {
        resolution: '1280x720',
        fps: 24,
        recordingEnabled: true,
      },
    },
  });

  console.log(`✅ Cameras created: ${camera1.name}, ${camera2.name}`);

  // Create demo inspections
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const inspection1 = await prisma.inspection.create({
    data: {
      tenantId: org.id,
      assetId: tower1.id,
      inspectorId: inspectorUser.id,
      scheduledDate: tomorrow,
      status: 'SCHEDULED',
      notes: 'Routine quarterly inspection',
    },
  });

  const inspection2 = await prisma.inspection.create({
    data: {
      tenantId: org.id,
      assetId: tower2.id,
      inspectorId: inspectorUser.id,
      scheduledDate: new Date(),
      status: 'IN_PROGRESS',
      notes: 'Post-maintenance inspection',
    },
  });

  console.log(
    `✅ Inspections created: ${inspection1.id} (${tower1.name}), ${inspection2.id} (${tower2.name})`,
  );

  // Create demo incidents
  const incident1 = await prisma.incident.create({
    data: {
      tenantId: org.id,
      assetId: tower1.id,
      reporterId: inspectorUser.id,
      title: 'Tower Sway Detected',
      description: 'Unusual sway detected during inspection. Wind speed 45mph.',
      severity: 'HIGH',
      status: 'INVESTIGATING',
    },
  });

  const incident2 = await prisma.incident.create({
    data: {
      tenantId: org.id,
      assetId: solarFarm.id,
      reporterId: managerUser.id,
      title: 'Panel Efficiency Drop',
      description: 'Output down 15% below expected. Requires diagnostics.',
      severity: 'MEDIUM',
      status: 'OPEN',
    },
  });

  console.log(`✅ Incidents created: ${incident1.title}, ${incident2.title}`);

  // Assign incidents
  await prisma.incidentAssignment.create({
    data: {
      tenantId: org.id,
      incidentId: incident1.id,
      assignedTo: managerUser.id,
    },
  });

  console.log(`✅ Incident assignments created`);

  // Add incident comments
  await prisma.incidentComment.create({
    data: {
      tenantId: org.id,
      incidentId: incident1.id,
      authorId: inspectorUser.id,
      content: 'Initial assessment: structural integrity appears sound',
    },
  });

  console.log(`✅ Incident comments created`);

  console.log('');
  console.log('✅ Seed complete! Demo data ready.');
  console.log('');
  console.log('Demo Credentials:');
  console.log('  Admin:     admin@demo.local / Demo@Password123');
  console.log('  Manager:   manager@demo.local / Demo@Password123');
  console.log('  Inspector: inspector@demo.local / Demo@Password123');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
