import { Redis } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redisEnabled = Boolean(env.REDIS_URL);

export const redisClient = redisEnabled
  ? new Redis(env.REDIS_URL as string, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })
  : null;

if (redisClient) {
  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  redisClient.on('error', (err) => {
    logger.warn({ err }, 'Redis unavailable; falling back to non-Redis behavior');
  });

  void redisClient.connect().catch((err) => {
    logger.warn({ err }, 'Redis connection failed during startup; continuing without Redis');
  });
} else {
  logger.info('Redis disabled; using in-memory rate limiting and no cache');
}

export async function cacheGet(key: string): Promise<string | null> {
  if (!redisClient) return null;

  try {
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

export async function cacheSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  if (!redisClient) return;

  try {
    await redisClient.setex(key, ttlSeconds, value);
  } catch {
    // Cache failures should never break request handling.
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!redisClient || keys.length === 0) return;

  try {
    await redisClient.del(...keys);
  } catch {
    // Cache failures should never break request handling.
  }
}
