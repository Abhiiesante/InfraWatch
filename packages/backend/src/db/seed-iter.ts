import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  const user = await prisma.user.findFirst();
  const assetType = await prisma.assetType.findFirst();

  if (!org || !user || !assetType) {
    console.error('Missing organization, user, or assetType in database');
    return;
  }

  const iterAsset = await prisma.asset.upsert({
    where: { id: 999 }, // Use or create
    update: {
      name: 'ITER Tokamak Fusion Reactor Core & Cryostat Complex',
      description: 'World largest magnetic confinement plasma tokamak reactor core with 18 superconducting toroidal field D-coils, central solenoid core, and cryostat containment shielding',
      latitude: new Decimal('43.6888'),
      longitude: new Decimal('5.7661'),
      address: 'ITER Headquarters, Route de Vinon-sur-Verdon, 13115 Saint-Paul-lès-Durance, France',
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
    create: {
      id: 999,
      tenantId: org.id,
      assetTypeId: assetType.id,
      createdById: user.id,
      name: 'ITER Tokamak Fusion Reactor Core & Cryostat Complex',
      description: 'World largest magnetic confinement plasma tokamak reactor core with 18 superconducting toroidal field D-coils, central solenoid core, and cryostat containment shielding',
      latitude: new Decimal('43.6888'),
      longitude: new Decimal('5.7661'),
      address: 'ITER Headquarters, Route de Vinon-sur-Verdon, 13115 Saint-Paul-lès-Durance, France',
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

  console.log('✅ Successfully seeded ITER Tokamak Fusion Reactor Core into Database:', iterAsset);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
