// backend/src/middleware/rateLimiter.ts
import { Request, RequestHandler } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logRateLimitHit } from '../services/securityEvent.service';
import { logger } from '../utils/logger';
import {
  getPublicReadRouteFamily,
  hasValidInternalSsrSecretValue,
  isPublicReadRequest,
  PublicReadRouteFamily,
} from './publicReadRoutes';

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
export const SSR_SECRET_HEADER = 'x-connect-shop-ssr-secret';

type PublicReadLimitEnvKey =
  | 'PUBLIC_READ_HOMEPAGE_LIMIT'
  | 'PUBLIC_READ_PRODUCT_LIST_LIMIT'
  | 'PUBLIC_READ_PRODUCT_DETAIL_LIMIT'
  | 'PUBLIC_READ_METADATA_LIMIT'
  | 'PUBLIC_READ_FALLBACK_LIMIT'
  | 'PUBLIC_READ_SSR_LIMIT';

type RateLimitStoreFailurePolicy = 'fail-open' | 'fail-closed';

const PUBLIC_READ_LIMIT_DEFAULTS: Record<PublicReadLimitEnvKey, { development: number; production: number }> = {
  PUBLIC_READ_HOMEPAGE_LIMIT: { development: 12000, production: 2500 },
  PUBLIC_READ_PRODUCT_LIST_LIMIT: { development: 25000, production: 3000 },
  PUBLIC_READ_PRODUCT_DETAIL_LIMIT: { development: 12000, production: 3000 },
  PUBLIC_READ_METADATA_LIMIT: { development: 40000, production: 5000 },
  PUBLIC_READ_FALLBACK_LIMIT: { development: 10000, production: 1500 },
  PUBLIC_READ_SSR_LIMIT: { development: 50000, production: 10000 },
};

function parsePositiveLimit(value: string | undefined, fallback: number, key: PublicReadLimitEnvKey): number {
  if (!value) return fallback;

  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}

function publicReadLimit(key: PublicReadLimitEnvKey): number {
  const defaults = PUBLIC_READ_LIMIT_DEFAULTS[key];
  const fallback = isDev ? defaults.development : defaults.production;
  return parsePositiveLimit(env[key], fallback, key);
}

function classifyRedisStoreError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('max requests limit exceeded') || message.includes('quota')) {
    return 'quota_exceeded';
  }

  if (
    message.includes('connect') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('enotfound') ||
    message.includes('closed')
  ) {
    return 'connection_error';
  }

  return 'store_error';
}

function logRedisStoreError({
  error,
  command,
  failurePolicy,
  limiterName,
  prefix,
}: {
  error: unknown;
  command: string;
  failurePolicy: RateLimitStoreFailurePolicy;
  limiterName: string;
  prefix: string;
}): void {
  const logContext = {
    err: error,
    limiterName,
    prefix,
    redisCommand: command,
    redisFailureKind: classifyRedisStoreError(error),
    rateLimitFailurePolicy: failurePolicy,
  };

  const message =
    failurePolicy === 'fail-open'
      ? 'Redis rate-limit store failed; request will be allowed by limiter fail-open policy'
      : 'Redis rate-limit store failed; request will be blocked by limiter fail-closed policy';

  if (failurePolicy === 'fail-open') {
    logger.warn(logContext, message);
    return;
  }

  logger.error(logContext, message);
}

function createRedisStore(prefix: string, limiterName: string, failurePolicy: RateLimitStoreFailurePolicy) {
  if (!redisClient) return undefined;

  const client = redisClient;
  return new RedisStore({
    prefix,
    sendCommand: async (command: string, ...args: string[]) => {
      try {
        return await (client.call(command, ...args) as Promise<any>);
      } catch (error) {
        logRedisStoreError({
          error,
          command,
          failurePolicy,
          limiterName,
          prefix,
        });
        throw error;
      }
    },
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
  rateLimitStoreFailurePolicy,
}: {
  name: string;
  prefix: string;
  windowMs: number;
  productionLimit: number;
  developmentLimit: number;
  message: string;
  skip?: (req: Request) => boolean;
  rateLimitStoreFailurePolicy?: RateLimitStoreFailurePolicy;
}) {
  const failurePolicy = rateLimitStoreFailurePolicy ?? 'fail-closed';

  return rateLimit({
    windowMs,
    limit: isDev ? developmentLimit : productionLimit,
    keyGenerator: identityKeyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(prefix, name, failurePolicy),
    passOnStoreError: failurePolicy === 'fail-open',
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
 * General rate limiter — applies to all non-public-read routes.
 * Production: 600 requests per 15-minute window per identity/IP.
 * Storefront public reads use publicReadLimiter instead, so this stays broad while
 * stricter auth, checkout, cart, wishlist, review, upload, and admin mutation
 * limiters protect sensitive write paths.
 * Development/test: relaxed to avoid local HMR/session-check noise.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: GENERAL_LIMIT,
  standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,     // Disable `X-RateLimit-*` headers
  store: createRedisStore('rl:general:', 'general', 'fail-open'),
  passOnStoreError: true,
  skip: isPublicReadRequest,
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
 * Public storefront read limiters — applies only to safe public GET/HEAD reads.
 * Public reads are split into route-family buckets so one hot endpoint does not
 * exhaust every other public read route. Verified SSR requests use their own
 * finite bucket only when the server-only shared secret is valid.
 */
function createPublicReadLimiter(name: string, prefix: string, limit: number): RequestHandler {
  return rateLimit({
    windowMs: env.PUBLIC_READ_WINDOW_MS,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore(prefix, name, 'fail-open'),
    passOnStoreError: true,
    skip: (req) => !isPublicReadRequest(req),
    handler: (req, res) => {
      logRateLimitHit(req, name);
      res.status(429).json({
        success: false,
        message: 'Too many public browsing requests. Please try again later.',
      });
    },
    message: {
      success: false,
      message: 'Too many public browsing requests. Please try again later.',
    },
  });
}

const publicReadHomepageLimiter = createPublicReadLimiter(
  'public-read-homepage',
  'rl:public-read:homepage:',
  publicReadLimit('PUBLIC_READ_HOMEPAGE_LIMIT')
);

const publicReadProductListLimiter = createPublicReadLimiter(
  'public-read-product-list',
  'rl:public-read:product-list:',
  publicReadLimit('PUBLIC_READ_PRODUCT_LIST_LIMIT')
);

const publicReadProductDetailLimiter = createPublicReadLimiter(
  'public-read-product-detail',
  'rl:public-read:product-detail:',
  publicReadLimit('PUBLIC_READ_PRODUCT_DETAIL_LIMIT')
);

const publicReadMetadataLimiter = createPublicReadLimiter(
  'public-read-metadata',
  'rl:public-read:metadata:',
  publicReadLimit('PUBLIC_READ_METADATA_LIMIT')
);

const publicReadFallbackLimiter = createPublicReadLimiter(
  'public-read-fallback',
  'rl:public-read:fallback:',
  publicReadLimit('PUBLIC_READ_FALLBACK_LIMIT')
);

const publicReadSsrLimiter = createPublicReadLimiter(
  'public-read-ssr',
  'rl:public-read:ssr:',
  publicReadLimit('PUBLIC_READ_SSR_LIMIT')
);

export function hasValidInternalSsrSecret(req: Pick<Request, 'get'>): boolean {
  const expectedSecret = env.INTERNAL_SSR_API_SECRET;
  if (!expectedSecret) return false;

  const providedSecret = req.get(SSR_SECRET_HEADER);
  return hasValidInternalSsrSecretValue(providedSecret, expectedSecret);
}

const publicReadLimitersByFamily: Record<PublicReadRouteFamily, RequestHandler> = {
  homepage: publicReadHomepageLimiter,
  product_list: publicReadProductListLimiter,
  product_detail: publicReadProductDetailLimiter,
  metadata: publicReadMetadataLimiter,
  fallback: publicReadFallbackLimiter,
};

export function getPublicReadLimiterNameForRequest(req: Request): string | null {
  if (!isPublicReadRequest(req)) return null;
  if (hasValidInternalSsrSecret(req)) return 'public-read-ssr';

  const family = getPublicReadRouteFamily(req);
  return family ? `public-read-${family}` : null;
}

export const publicReadLimiter: RequestHandler = (req, res, next) => {
  if (!isPublicReadRequest(req)) {
    next();
    return;
  }

  if (hasValidInternalSsrSecret(req)) {
    publicReadSsrLimiter(req, res, next);
    return;
  }

  const family = getPublicReadRouteFamily(req);
  const limiter = family ? publicReadLimitersByFamily[family] : publicReadFallbackLimiter;
  limiter(req, res, next);
};

/**
 * Backward-compatible alias for tests/docs that need a single public-read
 * limiter shape. The implementation above dispatches to route-family buckets.
 */
export const legacyPublicReadLimiterShape = {
  windowMs: env.PUBLIC_READ_WINDOW_MS,
  limits: {
    homepage: publicReadLimit('PUBLIC_READ_HOMEPAGE_LIMIT'),
    productList: publicReadLimit('PUBLIC_READ_PRODUCT_LIST_LIMIT'),
    productDetail: publicReadLimit('PUBLIC_READ_PRODUCT_DETAIL_LIMIT'),
    metadata: publicReadLimit('PUBLIC_READ_METADATA_LIMIT'),
    fallback: publicReadLimit('PUBLIC_READ_FALLBACK_LIMIT'),
    ssr: publicReadLimit('PUBLIC_READ_SSR_LIMIT'),
  },
};

/**
 * Deprecated single-bucket public-read limiter kept only as a source comment:
 * Phase K intentionally replaced the one shared publicReadLimiter bucket.
 */
/*
rateLimit({
  windowMs: env.PUBLIC_READ_WINDOW_MS,
  limit: publicReadLimit('PUBLIC_READ_FALLBACK_LIMIT'),
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('rl:public-read:deprecated-single-bucket:', 'public-read-deprecated-single-bucket', 'fail-open'),
  passOnStoreError: true,
  skip: (req) => !isPublicReadRequest(req),
});
*/

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
  store: createRedisStore('rl:auth:', 'auth', 'fail-closed'),
  passOnStoreError: false,
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
  store: createRedisStore('rl:admin-read:', 'admin-read', 'fail-closed'),
  passOnStoreError: false,
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
