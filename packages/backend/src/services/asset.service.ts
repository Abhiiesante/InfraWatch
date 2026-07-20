import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';

export class AssetService {
  async listAssets(tenantId: number, options: { skip?: number; take?: number } = {}) {
    const { skip = 0, take = 20 } = options;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: { tenantId, deletedAt: null },
        include: { assetType: true, cameras: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.asset.count({ where: { tenantId, deletedAt: null } }),
    ]);

    return { assets, total, skip, take };
  }

  async getAsset(id: number, tenantId: number) {
    const asset = await prisma.asset.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { assetType: true, cameras: true },
    });

    if (!asset) {
      throw new NotFoundError('Asset');
    }

    return asset;
  }

  async createAsset(
    tenantId: number,
    userId: number,
    data: {
      name: string;
      description?: string;
      assetTypeId: number;
      latitude?: number;
      longitude?: number;
      address?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return prisma.asset.create({
      data: {
        ...data,
        tenantId,
        createdById: userId,
      },
      include: { assetType: true },
    });
  }

  async updateAsset(
    id: number,
    tenantId: number,
    data: Partial<{
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      address: string;
      status: string;
    }>,
  ) {
    const asset = await prisma.asset.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!asset) {
      throw new NotFoundError('Asset');
    }

    return prisma.asset.update({
      where: { id },
      data,
      include: { assetType: true },
    });
  }

  async deleteAsset(id: number, tenantId: number) {
    const asset = await prisma.asset.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!asset) {
      throw new NotFoundError('Asset');
    }

    return prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const assetService = new AssetService();
