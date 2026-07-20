import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo organization
  const org = await prisma.organization.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Demo Organization',
      domain: 'demo.infrawatch.local',
      plan: 'PROFESSIONAL',
      isActive: true,
    },
  });

  console.log(`✅ Organization created: ${org.name}`);

  // Create demo users
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: org.id, email: 'admin@demo.infrawatch.local' } },
    update: {},
    create: {
      tenantId: org.id,
      name: 'Admin User',
      email: 'admin@demo.infrawatch.local',
      hashedPassword: 'hashed_password_here', // Will be set by auth service
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Create demo asset types
  const towerType = await prisma.assetType.upsert({
    where: { id: 1 },
    update: {},
    create: {
      tenantId: org.id,
      name: 'Communication Tower',
      description: 'Cellular and communication towers',
      icon: 'tower',
      isActive: true,
    },
  });

  console.log(`✅ Asset type created: ${towerType.name}`);

  // Create demo asset
  const asset = await prisma.asset.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
      },
    },
  });

  console.log(`✅ Asset created: ${asset.name}`);

  console.log('✅ Seed complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
