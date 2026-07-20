import prisma from '@/lib/prisma.js';
import { NotFoundError, ForbiddenError } from '@/lib/errors.js';

export class OrganizationService {
  async getOrganization(id: number) {
    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, email: true, name: true, role: true, isActive: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    return org;
  }

  async getOrganizationStats(tenantId: number) {
    const [userCount, assetCount, incidentCount] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.asset.count({ where: { tenantId, deletedAt: null } }),
      prisma.incident.count({ where: { tenantId } }),
    ]);

    return {
      userCount,
      assetCount,
      incidentCount,
    };
  }

  async updateOrganization(id: number, data: { name?: string; domain?: string }) {
    const org = await prisma.organization.update({
      where: { id },
      data,
    });

    return org;
  }
}

export const organizationService = new OrganizationService();
