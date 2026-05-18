// backend/src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .default('5000')
    .transform((v) => parseInt(v, 10)),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Database
  DATABASE_URL: z
    .string()
    .url()
    .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    }),

  // Session
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters long'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_CALLBACK_URL: z.string().url('GOOGLE_CALLBACK_URL must be a valid URL'),

  // CORS
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  // Cookie
  COOKIE_MAX_AGE: z
    .string()
    .default('604800000')
    .transform((v) => parseInt(v, 10)),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    console.error('❌ Invalid environment variables:\n' + errors);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = typeof env;
