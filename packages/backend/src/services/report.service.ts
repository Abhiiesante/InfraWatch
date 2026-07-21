import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';

export class ReportService {
  async listReports(tenantId: number, options: { skip?: number; take?: number } = {}) {
    const { skip = 0, take = 20 } = options;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: { tenantId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.report.count({ where: { tenantId } }),
    ]);

    return { reports, total, skip, take };
  }

  async getReport(id: number, tenantId: number) {
    const report = await prisma.report.findFirst({
      where: { id, tenantId },
    });

    if (!report) {
      throw new NotFoundError('Report');
    }

    return report;
  }

  async createReport(
    tenantId: number,
    data: { title: string; type: string; data?: Record<string, unknown> },
  ) {
    return prisma.report.create({
      data: {
        tenantId,
        ...data,
      },
    });
  }
}

export const reportService = new ReportService();
