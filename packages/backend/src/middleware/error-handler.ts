import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/lib/errors.js';
import logger from '@/utils/logger.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  // Handle AppError (custom errors)
  if (err instanceof AppError) {
    logger.warn({
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
    });

    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  // Handle Prisma errors
  if ((err as any).code === 'P2025') {
    logger.warn('Resource not found');
    return res.status(404).json({
      error: 'Resource not found',
      code: 'NOT_FOUND',
    });
  }

  // Handle unknown errors
  logger.error({
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : JSON.stringify(err),
  });

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
  return;
};
