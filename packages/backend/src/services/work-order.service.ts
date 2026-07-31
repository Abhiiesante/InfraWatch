import prisma from '@/lib/prisma.js';
import { NotFoundError } from '@/lib/errors.js';
import { notificationService } from './notification.service.js';

export class WorkOrderService {
  async listWorkOrders(tenantId: number, options: { status?: string; assignedToId?: number } = {}) {
    const where: any = { tenantId };
    if (options.status) where.status = options.status;
    if (options.assignedToId) where.assignedToId = options.assignedToId;

    return prisma.workOrder.findMany({
      where,
      include: {
        asset: { select: { id: true, name: true, address: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        incident: { select: { id: true, title: true, severity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWorkOrder(id: number, tenantId: number) {
    const workOrder = await prisma.workOrder.findFirst({
      where: { id, tenantId },
      include: {
        asset: true,
        assignedTo: true,
        incident: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundError('WorkOrder');
    }

    return workOrder;
  }

  async createWorkOrder(
    tenantId: number,
    data: {
      incidentId?: number;
      assetId: number;
      assignedToId?: number;
      title: string;
      description?: string;
      priority?: string;
      slaHours?: number;
    },
  ) {
    const priority = data.priority || 'MEDIUM';
    const hours = data.slaHours || (priority === 'CRITICAL' ? 1 : priority === 'HIGH' ? 4 : 24);
    const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);

    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId,
        incidentId: data.incidentId,
        assetId: data.assetId,
        assignedToId: data.assignedToId,
        title: data.title,
        description: data.description,
        priority,
        status: 'PENDING',
        slaDeadline,
      },
      include: {
        asset: true,
        assignedTo: true,
      },
    });

    if (data.assignedToId) {
      await notificationService.createNotification({
        tenantId,
        userId: data.assignedToId,
        type: 'WORK_ORDER_ASSIGNED',
        title: 'New Work Order Assigned',
        message: `Work Order "${data.title}" assigned to you with SLA deadline of ${slaDeadline.toLocaleTimeString()}`,
        entityType: 'WORK_ORDER',
        entityId: workOrder.id,
      });
    }

    return workOrder;
  }

  async updateWorkOrder(
    id: number,
    tenantId: number,
    data: Partial<{
      status: string;
      signatureUrl: string;
      assignedToId: number;
    }>,
  ) {
    const existing = await this.getWorkOrder(id, tenantId);

    const updateData: any = { ...data };
    if (data.status === 'COMPLETED' && !existing.completedAt) {
      updateData.completedAt = new Date();
    }

    return prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        asset: true,
        assignedTo: true,
      },
    });
  }

  async getSLACountdown(tenantId: number) {
    const activeOrders = await prisma.workOrder.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        slaDeadline: true,
        status: true,
      },
      orderBy: { slaDeadline: 'asc' },
    });

    const now = new Date();
    return activeOrders.map((order) => {
      const remainingMs = order.slaDeadline.getTime() - now.getTime();
      const isBreached = remainingMs < 0;
      return {
        ...order,
        remainingMinutes: Math.round(remainingMs / 60000),
        isBreached,
      };
    });
  }
}

export const workOrderService = new WorkOrderService();
