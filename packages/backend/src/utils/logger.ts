import winston from 'winston';
import { env } from '@/config/env.js';

const colors = {
  error: '\x1b[31m',
  warn: '\x1b[33m',
  info: '\x1b[36m',
  debug: '\x1b[35m',
  reset: '\x1b[0m',
};

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} ${level}: ${message} ${metaStr}`;
        }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const levelColor = colors[level as keyof typeof colors] || colors.info;
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${colors.reset}${timestamp} ${levelColor}${level.toUpperCase()}${colors.reset}: ${message} ${metaStr}`;
      }),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export default logger;
