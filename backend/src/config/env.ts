// backend/src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const optionalEnvString = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().optional()
);

const optionalEnvUrl = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().url().optional()
);

const sampleRate = (defaultValue: string) => z
  .string()
  .default(defaultValue)
  .transform((value) => parseFloat(value))
  .refine((value) => Number.isFinite(value) && value >= 0 && value <= 1, {
    message: 'Sample rate must be between 0 and 1',
  });

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
  DB_STATEMENT_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform((v) => parseInt(v, 10)),

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
  REDIS_URL: z.string().url().optional(),

  // Sentry
  SENTRY_DSN: optionalEnvUrl,
  SENTRY_ENVIRONMENT: optionalEnvString,
  SENTRY_TRACES_SAMPLE_RATE: sampleRate('0.1'),
  SENTRY_PROFILES_SAMPLE_RATE: sampleRate('0.0'),

  // ImageKit
  IMAGEKIT_PUBLIC_KEY: optionalEnvString,
  IMAGEKIT_PRIVATE_KEY: optionalEnvString,
  IMAGEKIT_URL_ENDPOINT: optionalEnvUrl,
  IMAGEKIT_FOLDER: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().default('/connect-shop')
  ),

  // Cookie
  COOKIE_MAX_AGE: z
    .string()
    .default('604800000')
    .transform((v) => parseInt(v, 10)),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;

  const requiredImageKitKeys = [
    'IMAGEKIT_PUBLIC_KEY',
    'IMAGEKIT_PRIVATE_KEY',
    'IMAGEKIT_URL_ENDPOINT',
  ] as const;

  for (const key of requiredImageKitKeys) {
    if (!env[key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required in production`,
      });
    }
  }
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
