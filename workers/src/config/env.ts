import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().default('us-east-1'),
  SENDER_EMAIL: z.string().email(),
});

export const env = envSchema.parse(process.env);
