/**
 * Seed BIM Models for Existing Drone Video Assets
 *
 * Creates BIM model records and hotspots for assets that have
 * associated drone inspection videos, so the BIM viewer can
 * render proper 3D structures based on the asset type.
 *
 * Usage: npx tsx src/scripts/seed-bim-models.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import prisma from '../lib/prisma.js';

async function main() {
  console.log('🏗️ Seeding BIM Models for Drone Video Assets...\n');

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('❌ No organization found.');
    return;
  }
  const tenantId = org.id;

  // Get all assets that have associated inspection videos
  const assetsWithVideos = await prisma.asset.findMany({
    where: {
      tenantId,
      inspectionVideos: { some: {} },
    },
    include: {
      inspectionVideos: {
        select: { id: true, fileName: true, status: true },
      },
    },
  });

  console.log(`Found ${assetsWithVideos.length} assets with drone inspection videos.\n`);

  // Also get the core infrastructure assets without videos
  const infraAssets = await prisma.asset.findMany({
    where: {
      tenantId,
      name: {
        in: [
          'Meridian Fusion Research Reactor & Cryostat Complex',
          'Axion Particle Accelerator Ring & Cavern Complex',
          'Kamala Valley High-Altitude Railway Arch Bridge',
          'Westshore Bay Cable-Stayed Marine Link',
          'Longshan Hydroelectric Power Dam & Lock Complex',
          'Albion Deep-Core Transit Tunnel',
          'Naruto Strait Suspension Bridge',
          'Redrock Canyon Hydroelectric Dam & Reservoir',
          'Northsea Array Offshore Wind Energy Farm',
          'Suryanagar Ultra Mega Solar Power Park',
        ],
      },
    },
  });

  const allAssets = [...assetsWithVideos, ...infraAssets];
  // Deduplicate by id
  const uniqueAssets = Array.from(new Map(allAssets.map(a => [a.id, a])).values());

  // Clear existing BIM data
  await prisma.bimHotspot.deleteMany({ where: { tenantId } });
  await prisma.bimModel.deleteMany({ where: { tenantId } });
  console.log('🗑️ Cleared existing BIM models and hotspots.\n');

  const bimConfigs: Array<{
    nameMatch: string;
    bimType: string;
    bimFormat: string;
    elementCount: number;
    stressMPa: number;
    thermalC: number;
    healthRating: string;
    hotspotLabel: string;
    hotspotStress: string;
    hotspotMPa: number;
    hotspotLocation: string;
    magneticFieldTesla?: number;
    plasmaTempMillionC?: number;
    cryostatVacuumPa?: string;
    activeCoils?: number;
    totalCoils?: number;
  }> = [
    {
      nameMatch: 'fusion|reactor|meridian|tokamak|iter',
      bimType: 'TOKAMAK_FUSION_REACTOR',
      bimFormat: 'IFC4_FUSION_TOKAMAK_ADVANCED_BIM',
      elementCount: 18400,
      stressMPa: 148.5,
      thermalC: 85.2,
      healthRating: 'OPTIMAL',
      hotspotLabel: 'D-Coil #04 Cryostat Feeder',
      hotspotStress: 'HIGH',
      hotspotMPa: 185.2,
      hotspotLocation: 'Toroidal Field Coil Bay Section 4',
      magneticFieldTesla: 11.8,
      plasmaTempMillionC: 150,
      cryostatVacuumPa: '1.0e-7',
      activeCoils: 18,
      totalCoils: 18,
    },
    {
      nameMatch: 'accelerator|collider|cern|hadron|atlas|axion|particle',
      bimType: 'PARTICLE_ACCELERATOR_COLLIDER',
      bimFormat: 'IFC4_COLLIDER_RING_BIM',
      elementCount: 22000,
      stressMPa: 132.5,
      thermalC: 42.1,
      healthRating: 'NOMINAL',
      hotspotLabel: 'ATLAS Toroid Octant #04',
      hotspotStress: 'HIGH',
      hotspotMPa: 162.0,
      hotspotLocation: 'ATLAS Detector Cavern Point 1',
    },
    {
      nameMatch: 'arch|railway|chenab|kamala',
      bimType: 'ARCH_BRIDGE',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 8200,
      stressMPa: 140.0,
      thermalC: 38.5,
      healthRating: 'NOMINAL',
      hotspotLabel: 'Arch Crown Apex Girder',
      hotspotStress: 'CRITICAL',
      hotspotMPa: 195.0,
      hotspotLocation: 'Midspan Crown Section',
    },
    {
      nameMatch: 'cable|sea link|bandra|westshore|marine',
      bimType: 'CABLE_STAYED_BRIDGE',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 6800,
      stressMPa: 128.0,
      thermalC: 32.1,
      healthRating: 'NOMINAL',
      hotspotLabel: 'Anchor Pier #2 Foundation',
      hotspotStress: 'CRITICAL',
      hotspotMPa: 172.5,
      hotspotLocation: 'Western Approach Pier Caisson',
    },
    {
      nameMatch: 'dam|hydroelectric|gorges|yangtze|hoover|longshan|redrock|reservoir',
      bimType: 'HYDROELECTRIC_DAM',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 12500,
      stressMPa: 124.0,
      thermalC: 28.3,
      healthRating: 'OPTIMAL',
      hotspotLabel: 'Penstock Turbine Sluice #03',
      hotspotStress: 'HIGH',
      hotspotMPa: 158.0,
      hotspotLocation: 'Powerhouse Bay 3 Intake',
    },
    {
      nameMatch: 'tunnel|gotthard|albion|transit',
      bimType: 'TRANSIT_TUNNEL',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 9600,
      stressMPa: 118.0,
      thermalC: 22.4,
      healthRating: 'NOMINAL',
      hotspotLabel: 'Crown Vault Ring #18',
      hotspotStress: 'ELEVATED',
      hotspotMPa: 142.0,
      hotspotLocation: 'Twin Bore Section 18 Cross-Passage',
    },
    {
      nameMatch: 'suspension|naruto|akashi|strait',
      bimType: 'SUSPENSION_BRIDGE',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 7400,
      stressMPa: 135.0,
      thermalC: 35.7,
      healthRating: 'NOMINAL',
      hotspotLabel: 'Main Cable Saddle West Tower',
      hotspotStress: 'HIGH',
      hotspotMPa: 168.0,
      hotspotLocation: 'West Anchorage Tower Top',
    },
    {
      nameMatch: 'wind|offshore|hornsea|northsea|turbine',
      bimType: 'OFFSHORE_WIND_FARM',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 5200,
      stressMPa: 112.0,
      thermalC: 18.6,
      healthRating: 'OPTIMAL',
      hotspotLabel: 'Nacelle Yaw Bearing #02',
      hotspotStress: 'HIGH',
      hotspotMPa: 148.0,
      hotspotLocation: 'Turbine 2 Nacelle Assembly',
    },
    {
      nameMatch: 'solar|photovoltaic|bhadla|suryanagar',
      bimType: 'SOLAR_POWER_PARK',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 4800,
      stressMPa: 76.0,
      thermalC: 65.4,
      healthRating: 'OPTIMAL',
      hotspotLabel: 'PV Inverter Bus Junction D-04',
      hotspotStress: 'NOMINAL',
      hotspotMPa: 88.0,
      hotspotLocation: 'Central Inverter Station Array D',
    },
    {
      nameMatch: 'warehouse|logistics|hub|distribution',
      bimType: 'WAREHOUSE_LOGISTICS',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 3600,
      stressMPa: 88.5,
      thermalC: 24.1,
      healthRating: 'NOMINAL',
      hotspotLabel: 'Rack Bay C-04 Load Beam',
      hotspotStress: 'ELEVATED',
      hotspotMPa: 112.0,
      hotspotLocation: 'High-Bay Zone C Aisle 4',
    },
    {
      nameMatch: 'industrial|facility|demolition|infrastructure|zone',
      bimType: 'INDUSTRIAL_FACILITY',
      bimFormat: 'IFC4_DYNAMIC_MESH',
      elementCount: 5800,
      stressMPa: 105.0,
      thermalC: 42.8,
      healthRating: 'NOMINAL',
      hotspotLabel: 'Main Structural Frame Bay #06',
      hotspotStress: 'HIGH',
      hotspotMPa: 145.0,
      hotspotLocation: 'Processing Tower Level 6',
    },
  ];

  let seeded = 0;

  for (const asset of uniqueAssets) {
    const nameUpper = asset.name.toUpperCase();

    // Find matching BIM config
    let config = bimConfigs.find(c => {
      const patterns = c.nameMatch.split('|');
      return patterns.some(p => nameUpper.includes(p.toUpperCase()));
    });

    if (!config) {
      // Default fallback for any unmatched asset
      config = bimConfigs[bimConfigs.length - 1]; // Industrial Facility default
    }

    const bimModel = await prisma.bimModel.create({
      data: {
        tenantId,
        assetId: asset.id,
        fileName: `${asset.name.replace(/[^a-zA-Z0-9]/g, '_')}_BIM.ifc`,
        bimFormat: config.bimFormat,
        bimType: config.bimType,
        elementCount: config.elementCount,
        structuralStressMPa: config.stressMPa,
        thermalGradientC: config.thermalC,
        healthRating: config.healthRating,
        magneticFieldTesla: config.magneticFieldTesla ?? null,
        plasmaTempMillionC: config.plasmaTempMillionC ?? null,
        cryostatVacuumPa: config.cryostatVacuumPa ?? null,
        activeCoils: config.activeCoils ?? null,
        totalCoils: config.totalCoils ?? null,
      },
    });

    await prisma.bimHotspot.create({
      data: {
        tenantId,
        bimModelId: bimModel.id,
        elementId: config.hotspotLabel,
        stressLevel: config.hotspotStress,
        valueMPa: config.hotspotMPa,
        location: config.hotspotLocation,
      },
    });

    seeded++;
    console.log(`  ✅ BIM Model #${bimModel.id} → "${asset.name}" [${config.bimType}]`);
  }

  console.log(`\n🎉 Seeded ${seeded} BIM Models with hotspots for the Digital Twin viewer.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
