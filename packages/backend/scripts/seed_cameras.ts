import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const asset = await prisma.asset.findFirst();
  if (!asset) {
    console.log('No assets found. Cannot seed cameras.');
    return;
  }

  await prisma.camera.createMany({
    data: [
      {
        tenantId: asset.tenantId,
        assetId: asset.id,
        name: 'Tokyo Warehouse Assembly Cam 01',
        cameraType: 'OPTICAL 4K',
        rtspUrl: 'rtsp://internal/cam1',
        ipAddress: '192.168.1.100',
        status: 'ONLINE',
      },
      {
        tenantId: asset.tenantId,
        assetId: asset.id,
        name: 'NYC Fulfillment Center Line',
        cameraType: 'OPTICAL 360 PTZ',
        rtspUrl: 'rtsp://internal/cam2',
        ipAddress: '192.168.1.101',
        status: 'ONLINE',
      },
      {
        tenantId: asset.tenantId,
        assetId: asset.id,
        name: 'Venice Logistics Hub',
        cameraType: 'THERMAL',
        rtspUrl: 'rtsp://internal/cam3',
        ipAddress: '192.168.1.102',
        status: 'ONLINE',
      }
    ]
  });
  console.log('Successfully seeded 3 cameras!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
