import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (err instanceof AppError) {
    logger.error({
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  logger.error({
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    error: 'Internal server error',
  });
};
