import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  
  // AWS/S3
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Email
  AWS_SES_REGION: z.string().default('us-east-1'),
  SENDER_EMAIL: z.string().email(),
});

export const env = envSchema.parse(process.env);
