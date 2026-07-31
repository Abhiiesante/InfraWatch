import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';

export class IncidentService {
  async listIncidents(
    tenantId: number,
    options: { skip?: number; take?: number; status?: string; severity?: string } = {},
  ) {
    const { skip = 0, take = 20, status, severity } = options;

    const where: any = { tenantId };
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        include: {
          asset: true,
          reporter: { select: { id: true, name: true, email: true } },
          assignments: { include: { user: { select: { id: true, name: true } } } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.incident.count({ where }),
    ]);

    return { incidents, total, skip, take };
  }

  async getIncident(id: number, tenantId: number) {
    const incident = await prisma.incident.findFirst({
      where: { id, tenantId },
      include: {
        asset: true,
        reporter: { select: { id: true, name: true, email: true } },
        assignments: { include: { user: { select: { id: true, name: true } } } },
        comments: { include: { author: { select: { id: true, name: true } } } },
      },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    return incident;
  }

  async createIncident(
    tenantId: number,
    userId: number,
    data: { title: string; description?: string; assetId?: number; severity?: string },
  ) {
    return prisma.incident.create({
      data: {
        tenantId,
        reporterId: userId,
        ...data,
        severity: data.severity || 'MEDIUM',
      },
      include: {
        asset: true,
        reporter: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateIncident(
    id: number,
    tenantId: number,
    data: { title?: string; description?: string; severity?: string; status?: string },
  ) {
    const incident = await prisma.incident.findFirst({
      where: { id, tenantId },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    return prisma.incident.update({
      where: { id },
      data,
      include: {
        asset: true,
        reporter: true,
        assignments: true,
      },
    });
  }

  async assignIncident(id: number, tenantId: number, userId: number) {
    const incident = await prisma.incident.findFirst({
      where: { id, tenantId },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    return prisma.incidentAssignment.create({
      data: { tenantId, incidentId: id, assignedTo: userId },
    });
  }

  async addComment(id: number, tenantId: number, userId: number, content: string) {
    const incident = await prisma.incident.findFirst({
      where: { id, tenantId },
    });

    if (!incident) {
      throw new NotFoundError('Incident');
    }

    return prisma.incidentComment.create({
      data: { tenantId, incidentId: id, authorId: userId, content },
    });
  }
}

export const incidentService = new IncidentService();
