import prisma from '@/lib/prisma.js';

export class NotificationService {
  static async getUserNotifications(tenantId: number, userId: number, skip = 0, take = 20) {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { tenantId, userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({
        where: { tenantId, userId },
      }),
    ]);

    const unreadCount = await prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });

    return { notifications, total, unreadCount };
  }

  static async markAsRead(tenantId: number, userId: number, notificationId: number) {
    return prisma.notification.updateMany({
      where: { id: notificationId, tenantId, userId },
      data: { isRead: true },
    });
  }

  static async markAllAsRead(tenantId: number, userId: number) {
    return prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true },
    });
  }

  static async createNotification(data: {
    tenantId: number;
    userId: number;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: number;
  }) {
    return prisma.notification.create({
      data,
    });
  }

  static async notifyTenantUsers(
    tenantId: number,
    type: string,
    title: string,
    message: string,
    entityType?: string,
    entityId?: number,
  ) {
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    return Promise.all(
      users.map((u) =>
        this.createNotification({
          tenantId,
          userId: u.id,
          type,
          title,
          message,
          entityType,
          entityId,
        }),
      ),
    );
  }
}

export const notificationService = NotificationService;

