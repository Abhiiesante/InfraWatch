import prisma from '@/lib/prisma.js';
import { hashPassword } from '@/lib/crypto.js';
import { NotFoundError, ConflictError } from '@/lib/errors.js';

export class UserService {
  async getUserById(id: number, tenantId: number) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  async getUsersByTenant(tenantId: number) {
    return prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, name: true, role: true, phone: true, isActive: true },
    });
  }

  async createUser(
    tenantId: number,
    data: { email: string; password: string; name: string; role: string },
  ) {
    // Check if email exists in tenant
    const existing = await prisma.user.findFirst({
      where: { tenantId, email: data.email },
    });

    if (existing) {
      throw new ConflictError('Email already exists in organization');
    }

    const hashedPassword = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        hashedPassword,
        name: data.name,
        role: data.role,
      },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async updateUser(
    id: number,
    tenantId: number,
    data: { name?: string; phone?: string; role?: string },
  ) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, phone: true },
    });
  }

  async deactivateUser(id: number, tenantId: number) {
    const user = await prisma.user.findFirst({
      where: { id, tenantId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

export const userService = new UserService();
