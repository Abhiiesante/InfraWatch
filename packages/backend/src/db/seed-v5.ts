import prisma from '../lib/prisma.js';

async function main() {
  console.log('🌱 Seeding v5 (Real Backend) Data...');

  // 1. Get first organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found. Please run normal seed first.');
    return;
  }
  const tenantId = org.id;
  console.log(`Using Organization ID: ${tenantId}`);

  // 2. Get some assets
  const assets = await prisma.asset.findMany({
    where: { tenantId },
    take: 5
  });

  if (assets.length === 0) {
    console.error('❌ No assets found for organization.');
    return;
  }

  // Clear existing to avoid duplicates if run multiple times
  await prisma.scadaActuator.deleteMany();
  await prisma.droneMission.deleteMany();
  await prisma.drone.deleteMany();
  await prisma.bimHotspot.deleteMany();
  await prisma.bimModel.deleteMany();

  // 3. Seed SCADA Actuators
  const scadaTypes = ['CIRCUIT_BREAKER', 'HYDRAULIC_SURGE_VALVE', 'EMERGENCY_GENERATOR', 'HVAC_EXHAUST_TURBINE'];
  for (let i = 0; i < assets.length; i++) {
    await prisma.scadaActuator.create({
      data: {
        tenantId,
        assetId: assets[i].id,
        name: `Actuator for ${assets[i].name}`,
        type: scadaTypes[i % scadaTypes.length],
        status: 'ENGAGED',
        lastCommandAt: new Date()
      }
    });
  }
  console.log(`✅ Seeded ${assets.length} SCADA Actuators`);

  // 4. Seed Drones
  const drones = await Promise.all([
    prisma.drone.create({
      data: {
        tenantId,
        name: 'AeroGuard Thermal-X4',
        model: 'Matrice 300 RTK Industrial',
        status: 'IN_FLIGHT_MISSION',
        batteryPercent: 87,
        currentLat: 40.7128,
        currentLng: -74.0060,
      }
    }),
    prisma.drone.create({
      data: {
        tenantId,
        name: 'SkyScout LiDAR Inspector',
        model: 'Autel EVO II Dual 640T',
        status: 'CHARGING_DOCK',
        batteryPercent: 100,
        currentLat: 40.7130,
        currentLng: -74.0065,
      }
    })
  ]);
  console.log(`✅ Seeded 2 Drones`);

  // 5. Seed Drone Missions
  // Find an inspection
  const inspection = await prisma.inspection.findFirst({ where: { tenantId } });
  if (inspection) {
    await prisma.droneMission.create({
      data: {
        tenantId,
        droneId: drones[0].id,
        inspectionId: inspection.id,
        status: 'EXECUTING',
        startTime: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
        waypointsCompleted: 8,
        totalWaypoints: 20,
        currentAltitude: 120.5,
        currentSpeed: 25.4
      }
    });
    console.log(`✅ Seeded 1 Drone Mission tied to Inspection ID ${inspection.id}`);
  }

  // 6. Seed BIM Models
  for (let i = 0; i < Math.min(2, assets.length); i++) {
    const asset = assets[i];
    const isFusion = asset.name.toLowerCase().includes('meridian') || asset.name.toLowerCase().includes('fusion');
    
    const bimModel = await prisma.bimModel.create({
      data: {
        tenantId,
        assetId: asset.id,
        fileName: `${asset.name.replace(/\s+/g, '_')}_CAD.ifc`,
        bimFormat: isFusion ? 'IFC4_FUSION_TOKAMAK_ADVANCED_BIM' : 'IFC4_DYNAMIC_MESH',
        bimType: isFusion ? 'TOKAMAK_FUSION_REACTOR' : 'CIVIL_INFRASTRUCTURE',
        elementCount: 4500,
        structuralStressMPa: 120.5,
        thermalGradientC: 45.2,
        healthRating: 'OPTIMAL',
        magneticFieldTesla: isFusion ? 11.8 : null,
        plasmaTempMillionC: isFusion ? 150 : null,
        cryostatVacuumPa: isFusion ? '1.0e-7' : null,
        activeCoils: isFusion ? 18 : null,
        totalCoils: isFusion ? 18 : null,
      }
    });

    // Add Hotspots
    await prisma.bimHotspot.create({
      data: {
        tenantId,
        bimModelId: bimModel.id,
        elementId: `COMPONENT-${asset.id}-01`,
        stressLevel: 'ELEVATED',
        valueMPa: 185.2,
        location: 'Main Support Truss'
      }
    });
  }
  console.log(`✅ Seeded BIM Models & Hotspots`);

  console.log('🎉 Seeding Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
