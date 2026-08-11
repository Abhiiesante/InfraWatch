import { telemetryService } from '@/services/telemetry.service.js';
import { DataIntelligenceService } from '@/services/data-intelligence.service.js';
import prisma from '@/lib/prisma.js';

async function run() {
  console.log('Generating fake telemetry data...');
  
  // Wait for Prisma to connect
  await prisma.$connect();
  
  // Use a hardcoded tenantId (e.g. 1) and assetId (e.g. 1)
  const tenantId = 1;
  const assetId = 1;
  
  // Generate 10 readings
  for (let i = 0; i < 10; i++) {
    const value = 20 + Math.random() * 15; // Temperature between 20 and 35
    
    // Instead of full ingestReading (which might try to create alerts and fail if asset doesn't exist),
    // let's just invoke DataIntelligenceService directly for the test.
    await DataIntelligenceService.syncTelemetryToDataPlatform({
      tenantId,
      assetId,
      sensorType: 'TEMP_SENSOR',
      value,
      unit: 'C',
      isAnomaly: value > 30,
      timestamp: new Date()
    });
    console.log(`Generated reading ${i+1}: ${value.toFixed(2)} C`);
  }
  
  console.log('Done!');
  await prisma.$disconnect();
}

run().catch(console.error);
