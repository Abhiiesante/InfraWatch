import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';

export class CameraService {
  async listCameras(tenantId: number, options: { skip?: number; take?: number; assetId?: number } = {}) {
    const { skip = 0, take = 20, assetId } = options;

    const where: Record<string, unknown> = { tenantId };
    if (assetId) where.assetId = assetId;

    const [cameras, total] = await Promise.all([
      prisma.camera.findMany({
        where,
        include: { asset: { select: { id: true, name: true } } },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.camera.count({ where }),
    ]);

    return { cameras, total, skip, take };
  }

  async getCamera(id: number, tenantId: number) {
    const camera = await prisma.camera.findFirst({
      where: { id, tenantId },
      include: {
        asset: { select: { id: true, name: true, status: true } },
        inspectionImages: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!camera) {
      throw new NotFoundError('Camera');
    }

    return camera;
  }

  async createCamera(
    tenantId: number,
    data: {
      assetId: number;
      name: string;
      cameraType: string;
      rtspUrl: string;
      ipAddress?: string;
      config?: Record<string, unknown>;
    },
  ) {
    // Verify the asset belongs to this tenant
    const asset = await prisma.asset.findFirst({
      where: { id: data.assetId, tenantId, deletedAt: null },
    });

    if (!asset) {
      throw new NotFoundError('Asset');
    }

    return prisma.camera.create({
      data: {
        tenantId,
        ...data,
      },
      include: { asset: { select: { id: true, name: true } } },
    });
  }

  async updateCamera(
    id: number,
    tenantId: number,
    data: Partial<{
      name: string;
      cameraType: string;
      rtspUrl: string;
      ipAddress: string;
      config: Record<string, unknown>;
      status: string;
    }>,
  ) {
    const camera = await prisma.camera.findFirst({
      where: { id, tenantId },
    });

    if (!camera) {
      throw new NotFoundError('Camera');
    }

    return prisma.camera.update({
      where: { id },
      data,
      include: { asset: { select: { id: true, name: true } } },
    });
  }

  async deleteCamera(id: number, tenantId: number) {
    const camera = await prisma.camera.findFirst({
      where: { id, tenantId },
    });

    if (!camera) {
      throw new NotFoundError('Camera');
    }

    return prisma.camera.delete({ where: { id } });
  }
}

export const cameraService = new CameraService();
