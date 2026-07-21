import jwt from 'jsonwebtoken';
import { env } from '@/config/env.js';
import { UnauthorizedError } from './errors.js';

export interface JwtPayload {
  userId: number;
  tenantId: number;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

export const createAccessToken = (payload: Omit<JwtPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_SECRET as any, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
};

export const createRefreshToken = (payload: Omit<JwtPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET as any, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    throw error;
  }
};
