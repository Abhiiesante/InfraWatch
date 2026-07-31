import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';

export class AssetTypeService {
  async listAssetTypes(tenantId: number, options: { skip?: number; take?: number } = {}) {
    const { skip = 0, take = 50 } = options;

    const assetTypes = await prisma.assetType.findMany({
      where: { tenantId },
      skip,
      take,
      orderBy: { name: 'asc' },
    });
    const total = await prisma.assetType.count({ where: { tenantId } });

    return { assetTypes, total, skip, take };
  }

  async getAssetType(id: number, tenantId: number) {
    const assetType = await prisma.assetType.findFirst({
      where: { id, tenantId },
    });

    if (!assetType) {
      throw new NotFoundError('AssetType');
    }

    return assetType;
  }

  async createAssetType(
    tenantId: number,
    data: { name: string; description?: string; icon?: string },
  ) {
    return prisma.assetType.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }

  async updateAssetType(
    id: number,
    tenantId: number,
    data: Partial<{ name: string; description: string; icon: string; isActive: boolean }>,
  ) {
    const assetType = await prisma.assetType.findFirst({
      where: { id, tenantId },
    });

    if (!assetType) {
      throw new NotFoundError('AssetType');
    }

    return prisma.assetType.update({
      where: { id },
      data,
    });
  }

  async deleteAssetType(id: number, tenantId: number) {
    const assetType = await prisma.assetType.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { assets: true } } },
    });

    if (!assetType) {
      throw new NotFoundError('AssetType');
    }

    if (assetType._count.assets > 0) {
      throw new Error('Cannot delete asset type that has associated assets');
    }

    return prisma.assetType.delete({ where: { id } });
  }
}

export const assetTypeService = new AssetTypeService();
