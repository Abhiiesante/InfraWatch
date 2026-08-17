import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const camera = await prisma.camera.findFirst();

  if (!camera) {
    console.log('No warehouse camera found.');
    return;
  }

  console.log(`Creating test anomaly for camera ${camera.id}`);

  const testAnomaly = await prisma.anomalyDetection.create({
    data: {
      tenantId: camera.tenantId,
      cameraId: camera.id,
      imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1280&q=80',
      detections: [
        {
          label: 'RESTRICTED_ZONE_VIOLATION',
          confidence: 0.95,
          severity: 'CRITICAL',
          bbox: [500, 300, 100, 250], // absolute pixel coordinates
          imageWidth: 1280,
          imageHeight: 720
        },
        {
          label: 'FORKLIFT',
          confidence: 0.88,
          severity: 'INFO',
          bbox: [800, 200, 200, 200],
          imageWidth: 1280,
          imageHeight: 720
        }
      ],
      confidence: 0.95,
      status: 'PENDING_REVIEW'
    }
  });

  console.log('Test anomaly created:', testAnomaly.id);
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
