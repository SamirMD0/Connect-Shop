import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisEnabled = Boolean(env.REDIS_URL);

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

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient) return null;

  try {
    return await redisClient.get(key);
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache get failed; treating as cache miss');
    return null;
  }
}

export async function cacheSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  if (!redisClient) return;

  try {
    await redisClient.setex(key, ttlSeconds, value);
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache set failed; continuing without cache');
    // Cache failures should never break request handling.
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redisClient || keys.length === 0) return;

  try {
    await redisClient.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, 'Redis cache delete failed; continuing without cache');
    // Cache failures should never break request handling.
  }
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const cached = await cacheGet(key);
  if (!cached) return null;

  try {
    return JSON.parse(cached) as T;
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache JSON parse failed; deleting bad key');
    await cacheDel(key);
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
    logger.warn({ err, pattern }, 'Redis pattern delete failed; continuing without cache invalidation');
  }
}
