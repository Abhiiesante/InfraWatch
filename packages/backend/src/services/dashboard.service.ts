import prisma from '@/lib/prisma.js';

export class DashboardService {
  async getDashboardStats(tenantId: number) {
    const [
      totalUsers,
      totalAssets,
      totalIncidents,
      openIncidents,
      activeAssets,
      recentInspections,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.asset.count({ where: { tenantId, deletedAt: null } }),
      prisma.incident.count({ where: { tenantId } }),
      prisma.incident.count({ where: { tenantId, status: 'OPEN' } }),
      prisma.asset.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      prisma.inspection.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { name: true } },
          inspector: { select: { name: true } },
        },
      }),
    ]);

    return {
      userCount: totalUsers,
      assetCount: totalAssets,
      incidentCount: totalIncidents,
      openIncidentCount: openIncidents,
      activeAssetCount: activeAssets,
      recentInspections,
    };
  }
}

export const dashboardService = new DashboardService();
