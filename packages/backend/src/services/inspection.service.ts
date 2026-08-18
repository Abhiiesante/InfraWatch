import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';
import { DataIntelligenceService } from './data-intelligence.service.js';

export class InspectionService {
  async listInspections(
    tenantId: number,
    options: { skip?: number; take?: number; assetId?: number } = {},
  ) {
    const { skip = 0, take = 20, assetId } = options;

    const where: any = { tenantId };
    if (assetId) where.assetId = assetId;

    const [inspections, total] = await Promise.all([
      prisma.inspection.findMany({
        where,
        include: { asset: true, inspector: { select: { id: true, name: true, email: true } } },
        skip,
        take,
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.inspection.count({ where }),
    ]);

    return { inspections, total, skip, take };
  }

  async getInspection(id: number, tenantId: number) {
    const inspection = await prisma.inspection.findFirst({
      where: { id, tenantId },
      include: {
        asset: true,
        inspector: { select: { id: true, name: true, email: true } },
        inspectionImages: true,
      },
    });

    if (!inspection) {
      throw new NotFoundError('Inspection');
    }

    return inspection;
  }

  async createInspection(
    tenantId: number,
    data: {
      assetId: number;
      inspectorId: number;
      scheduledDate: string;
      notes?: string;
    },
  ) {
    return prisma.inspection.create({
      data: {
        tenantId,
        ...data,
        scheduledDate: new Date(data.scheduledDate),
      },
      include: { asset: true, inspector: true },
    });
  }

  async updateInspection(
    id: number,
    tenantId: number,
    data: { status?: string; notes?: string; completedAt?: string },
  ) {
    const inspection = await prisma.inspection.findFirst({
      where: { id, tenantId },
    });

    if (!inspection) {
      throw new NotFoundError('Inspection');
    }

    const updateData: any = { ...data };
    if (data.completedAt) {
      updateData.completedAt = new Date(data.completedAt);
    } else if (data.status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.inspection.update({
      where: { id },
      data: updateData,
      include: { asset: true, inspector: true },
    });

    // Requirement F5.3: Completing an inspection updates lastInspectionAt on the asset
    if (data.status === 'COMPLETED' && updated.assetId) {
      try {
        const asset = await prisma.asset.findUnique({ where: { id: updated.assetId } });
        const existingMeta = (asset?.metadata as Record<string, any>) || {};
        await prisma.asset.update({
          where: { id: updated.assetId },
          data: {
            metadata: {
              ...existingMeta,
              lastInspectionAt: new Date().toISOString(),
              lastInspectionId: updated.id,
              lastInspectionStatus: updated.status,
            },
          },
        });
      } catch (err) {
        console.error('[InspectionService] Failed to update asset lastInspectionAt:', err);
      }
    }

    // Sync event to Data Platform
    DataIntelligenceService.syncInspectionToDataPlatform(tenantId, id).catch(() => {});

    return updated;
  }

  async uploadImage(id: number, tenantId: number, data: { imageUrl: string; caption?: string }) {
    const inspection = await prisma.inspection.findFirst({
      where: { id, tenantId },
    });

    if (!inspection) {
      throw new NotFoundError('Inspection');
    }

    return prisma.inspectionImage.create({
      data: {
        tenantId: tenantId,
        inspectionId: id,
        imageUrl: data.imageUrl,
        caption: data.caption,
      },
    });
  }
}

export const inspectionService = new InspectionService();
