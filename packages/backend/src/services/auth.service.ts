import prisma from '@/lib/prisma.js';
import { hashPassword, comparePasswords } from '@/lib/crypto.js';
import { createAccessToken, createRefreshToken } from '@/lib/jwt.js';
import { ValidationError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors.js';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  organization: {
    id: number;
    name: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if email already exists globally
    const existingUser = await prisma.user.findFirst({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: input.organizationName,
        plan: 'STARTER',
        isActive: true,
      },
    });

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user with ADMIN role
    const user = await prisma.user.create({
      data: {
        tenantId: organization.id,
        email: input.email,
        hashedPassword,
        name: input.name,
        role: 'ADMIN',
        isActive: true,
      },
    });

    // Generate tokens
    const accessToken = createAccessToken({
      userId: user.id,
      tenantId: organization.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = createRefreshToken({
      userId: user.id,
      tenantId: organization.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(input: LoginInput, tenantId?: number): Promise<AuthResponse> {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: input.email },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Verify password
    const passwordMatch = await comparePasswords(input.password, user.hashedPassword);
    if (!passwordMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = createAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = createRefreshToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: user.organization.id,
        name: user.organization.name,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refreshTokens(
    userId: number,
    tenantId: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    const accessToken = createAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    const refreshToken = createRefreshToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
