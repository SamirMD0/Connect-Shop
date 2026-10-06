import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';
import { recordCacheMetric } from '../utils/performance';
import { withDeadline } from '../utils/deadline';

export const redisEnabled = env.NODE_ENV !== 'test' && Boolean(env.REDIS_URL);

export const redisClient = redisEnabled
  ? new Redis(env.REDIS_URL as string, {
      maxRetriesPerRequest: 1,
    })
  : null;

if (redisClient) {
  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('error', (err) => {
    logger.warn({ err }, 'Redis unavailable; falling back to non-Redis behavior');
  });
} else {
  logger.info('Redis disabled; using in-memory rate limiting and no cache');
}

// Isolated from sensitive rate-limit commands. Never queue cache commands offline
// or replay them after reconnect (especially SETs arriving after invalidation).
const publicCacheClient = redisEnabled ? new Redis(env.REDIS_URL as string, {
  commandTimeout: env.REDIS_CACHE_TIMEOUT_MS,
  connectTimeout: 1000,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 0,
  autoResendUnfulfilledCommands: false,
  retryStrategy: () => null,
}) : null;
let cacheConnectAttemptAt = Date.now();
publicCacheClient?.on('error', () => { /* Individual operations record cache failures. */ });

function cacheReady(): boolean {
  if (!publicCacheClient) return false;
  if (publicCacheClient.status === 'end' && Date.now() - cacheConnectAttemptAt >= 5000) {
    cacheConnectAttemptAt = Date.now();
    void publicCacheClient.connect().catch(() => undefined);
  }
  return publicCacheClient.status === 'ready';
}

function stopPublicCache(): void {
  if (!publicCacheClient || publicCacheClient.status === 'end') return;
  cacheConnectAttemptAt = Date.now();
  publicCacheClient?.disconnect();
}

function cacheCommand<T>(load: () => Promise<T>): Promise<T> {
  return withDeadline(load, env.REDIS_CACHE_TIMEOUT_MS, stopPublicCache);
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!cacheReady() || !publicCacheClient) return null;

  try {
    return await cacheCommand(() => publicCacheClient.get(key));
  } catch (err) {
    stopPublicCache();
    recordCacheMetric(key, 'getFailures');
    logger.warn('Redis cache get failed; treating as cache miss');
    return null;
  }
}

export async function cacheSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  if (!cacheReady() || !publicCacheClient) return;

  try {
    await cacheCommand(() => publicCacheClient.setex(key, ttlSeconds, value));
  } catch (err) {
    stopPublicCache();
    recordCacheMetric(key, 'setFailures');
    logger.warn('Redis cache set failed; continuing without cache');
    // Cache failures should never break request handling.
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redisClient || keys.length === 0) return;

  try {
    await redisClient.del(...keys);
  } catch (err) {
    keys.forEach((key) => recordCacheMetric(key, 'deleteFailures'));
    logger.warn({ err, keys }, 'Redis cache delete failed; continuing without cache');
    // Cache failures should never break request handling.
  }
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const cached = await cacheGet(key);
  if (!cached) {
    recordCacheMetric(key, 'misses');
    return null;
  }

  try {
    recordCacheMetric(key, 'hits');
    return JSON.parse(cached) as T;
  } catch (err) {
    recordCacheMetric(key, 'jsonParseFailures');
    logger.warn('Redis cache JSON parse failed; deleting bad key');
    if (cacheReady() && publicCacheClient) {
      await cacheCommand(() => publicCacheClient.del(key)).catch(stopPublicCache);
    }
    return null;
  }
}

export async function setJsonCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (value === undefined || value === null) return;
  await cacheSetEx(key, ttlSeconds, JSON.stringify(value));
}

export async function delCache(...keys: string[]): Promise<void> {
  await cacheDel(...keys);
}

export async function delCacheByPattern(pattern: string): Promise<void> {
  if (!redisClient) return;

  try {
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      await redisClient.del(...keysToDelete);
    }
  } catch (err) {
    recordCacheMetric(pattern, 'deleteFailures');
    logger.warn({ err, pattern }, 'Redis pattern delete failed; continuing without cache invalidation');
  }
}
