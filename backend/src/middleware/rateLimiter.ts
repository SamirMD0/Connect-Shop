// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { env } from '../config/env';

const isDev = env.NODE_ENV !== 'production';
const GENERAL_LIMIT = isDev ? 1000 : 100;
const AUTH_LIMIT = isDev ? 200 : 20;

function createRedisStore(prefix: string) {
  if (!redisClient) return undefined;

  const client = redisClient;
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<any>,
  });
}

/**
 * General rate limiter — applies to all routes.
 * Production: 100 requests per 15-minute window per IP.
 * Development/test: relaxed to avoid local HMR/session-check noise.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: GENERAL_LIMIT,
  standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,     // Disable `X-RateLimit-*` headers
  store: createRedisStore('rl:general:'),
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Strict limiter for auth routes — prevents brute-force.
 * Production: 20 requests per 15-minute window per IP.
 * Development/test: relaxed while preserving rate limiting behavior.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: AUTH_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:auth:'),
  passOnStoreError: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});
