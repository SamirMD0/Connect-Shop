// backend/src/middleware/rateLimiter.ts
import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logRateLimitHit } from '../services/securityEvent.service';

const isDev = env.NODE_ENV !== 'production';
const GENERAL_LIMIT = isDev ? 1000 : 100;
const AUTH_LIMIT = isDev ? 200 : 20;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function createRedisStore(prefix: string) {
  if (!redisClient) return undefined;

  const client = redisClient;
  return new RedisStore({
    prefix,
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<any>,
  });
}

function identityKeyGenerator(req: Request): string {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  const ip = req.ip || req.socket.remoteAddress;
  return ip ? `ip:${ipKeyGenerator(ip)}` : 'ip:unknown';
}

function skipSafeMethods(req: Request): boolean {
  return SAFE_METHODS.has(req.method);
}

function createIdentityLimiter({
  name,
  prefix,
  windowMs,
  productionLimit,
  developmentLimit,
  message,
  skip,
}: {
  name: string;
  prefix: string;
  windowMs: number;
  productionLimit: number;
  developmentLimit: number;
  message: string;
  skip?: (req: Request) => boolean;
}) {
  return rateLimit({
    windowMs,
    limit: isDev ? developmentLimit : productionLimit,
    keyGenerator: identityKeyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(prefix),
    passOnStoreError: true,
    skip,
    handler: (req, res) => {
      logRateLimitHit(req, name);
      res.status(429).json({
        success: false,
        message,
      });
    },
    message: {
      success: false,
      message,
    },
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
  handler: (req, res) => {
    logRateLimitHit(req, 'general');
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
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
  handler: (req, res) => {
    logRateLimitHit(req, 'auth');
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
  },
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

/**
 * Identity-aware limiter for checkout/order creation.
 * Production: 5 order attempts per hour per authenticated user, or per IP for guest checkout.
 */
export const checkoutLimiter = createIdentityLimiter({
  name: 'checkout',
  prefix: 'rl:checkout:',
  windowMs: 60 * 60 * 1000,
  productionLimit: 5,
  developmentLimit: 100,
  message: 'Too many order attempts. Please try again later.',
});

/**
 * Identity-aware limiter for authenticated cart mutations.
 */
export const cartMutationLimiter = createIdentityLimiter({
  name: 'cart-mutation',
  prefix: 'rl:cart:',
  windowMs: 15 * 60 * 1000,
  productionLimit: 60,
  developmentLimit: 500,
  message: 'Too many cart updates. Please slow down.',
});

/**
 * Identity-aware limiter for authenticated wishlist mutations.
 */
export const wishlistMutationLimiter = createIdentityLimiter({
  name: 'wishlist-mutation',
  prefix: 'rl:wishlist:',
  windowMs: 15 * 60 * 1000,
  productionLimit: 60,
  developmentLimit: 500,
  message: 'Too many wishlist updates. Please slow down.',
});

/**
 * Identity-aware limiter for review/question creation.
 */
export const reviewMutationLimiter = createIdentityLimiter({
  name: 'review-mutation',
  prefix: 'rl:review:',
  windowMs: 60 * 60 * 1000,
  productionLimit: 10,
  developmentLimit: 100,
  message: 'Too many review or question submissions. Please try again later.',
});

/**
 * Identity-aware limiter for admin image uploads.
 */
export const uploadLimiter = createIdentityLimiter({
  name: 'upload',
  prefix: 'rl:upload:',
  windowMs: 60 * 60 * 1000,
  productionLimit: 10,
  developmentLimit: 100,
  message: 'Too many image uploads. Please try again later.',
});

/**
 * Identity-aware limiter for admin mutation routes.
 * GET/HEAD/OPTIONS are skipped so admin read workflows keep the global limiter only.
 */
export const adminMutationLimiter = createIdentityLimiter({
  name: 'admin-mutation',
  prefix: 'rl:admin-mutation:',
  windowMs: 15 * 60 * 1000,
  productionLimit: 100,
  developmentLimit: 500,
  message: 'Too many admin changes. Please slow down.',
  skip: skipSafeMethods,
});
