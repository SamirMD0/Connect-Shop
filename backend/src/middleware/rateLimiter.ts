// backend/src/middleware/rateLimiter.ts
import { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logRateLimitHit } from '../services/securityEvent.service';

const isDev = env.NODE_ENV !== 'production';
const GENERAL_LIMIT = isDev ? 2000 : 600;
const AUTH_LIMIT = isDev ? 200 : 20;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ADMIN_READ_DEVELOPMENT_LIMIT = 2000;
const ADMIN_READ_PRODUCTION_LIMITS: Record<string, number> = {
  support: 200,
  manager: 200,
  admin: 200,
  super_admin: 500,
};
export const ADMIN_MUTATION_PRODUCTION_LIMIT = 100;
export const SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT = 15;
export const SENSITIVE_ADMIN_ACTION_DEVELOPMENT_LIMIT = 100;

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

function skipUnsafeMethods(req: Request): boolean {
  return !SAFE_METHODS.has(req.method);
}

export function getAdminReadLimitForRole(role: string | undefined, nodeEnv = env.NODE_ENV): number {
  if (nodeEnv !== 'production') return ADMIN_READ_DEVELOPMENT_LIMIT;
  return ADMIN_READ_PRODUCTION_LIMITS[role || ''] || ADMIN_READ_PRODUCTION_LIMITS.support;
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
 * Production: 600 requests per 15-minute window per identity/IP.
 * Storefront pages fan out to several API reads, so this stays broad while
 * stricter auth, checkout, cart, wishlist, review, upload, and admin mutation
 * limiters protect sensitive write paths.
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
 * Role-aware limiter for authenticated admin dashboard reads only.
 * Must be mounted after requireAuth/isAdmin so req.user is available.
 * Production: support/manager/admin 200 reads per 15 minutes; super_admin 500.
 */
export const adminReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req) => getAdminReadLimitForRole(req.user?.role),
  keyGenerator: identityKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:admin-read:'),
  passOnStoreError: true,
  skip: skipUnsafeMethods,
  handler: (req, res) => {
    logRateLimitHit(req, 'admin-read', {
      role: req.user?.role,
      limit: getAdminReadLimitForRole(req.user?.role),
    });
    res.status(429).json({
      success: false,
      message: 'Too many admin dashboard requests. Please slow down.',
    });
  },
  message: {
    success: false,
    message: 'Too many admin dashboard requests. Please slow down.',
  },
});

/**
 * Strict identity-aware limiter for sensitive admin/security actions.
 * This stacks with adminMutationLimiter and is intentionally not role-expanded.
 */
export const sensitiveAdminActionLimiter = createIdentityLimiter({
  name: 'sensitive-admin-action',
  prefix: 'rl:sensitive-admin-action:',
  windowMs: 60 * 60 * 1000,
  productionLimit: SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT,
  developmentLimit: SENSITIVE_ADMIN_ACTION_DEVELOPMENT_LIMIT,
  message: 'Too many sensitive admin actions. Please try again later.',
});

/**
 * Identity-aware limiter for admin mutation routes.
 * GET/HEAD/OPTIONS are skipped so admin read workflows keep the global limiter only.
 */
export const adminMutationLimiter = createIdentityLimiter({
  name: 'admin-mutation',
  prefix: 'rl:admin-mutation:',
  windowMs: 15 * 60 * 1000,
  productionLimit: ADMIN_MUTATION_PRODUCTION_LIMIT,
  developmentLimit: 500,
  message: 'Too many admin changes. Please slow down.',
  skip: skipSafeMethods,
});
