import type { NextFunction, Request, Response } from 'express';
import { monitorEventLoopDelay } from 'perf_hooks';
import { logger } from './logger';
import { isPublicReadRequest } from '../middleware/publicReadRoutes';

type CacheMetricName = 'hits' | 'misses' | 'setFailures' | 'getFailures' | 'deleteFailures' | 'jsonParseFailures';

type CacheMetricCounts = Record<CacheMetricName, number>;

const CACHE_METRIC_NAMES: CacheMetricName[] = [
  'hits',
  'misses',
  'setFailures',
  'getFailures',
  'deleteFailures',
  'jsonParseFailures',
];

const cacheMetrics = new Map<string, CacheMetricCounts>();
let backgroundMonitorsStarted = false;

export function isPerfLoggingEnabled(): boolean {
  return process.env.PERF_LOGGING_ENABLED === 'true';
}

function readNumberEnv(name: string, defaultValue: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

function millisecondsFromNanoseconds(value: number): number {
  return Number((value / 1_000_000).toFixed(2));
}

function roundMilliseconds(value: number): number {
  return Number(value.toFixed(2));
}

function getCacheGroup(keyOrPattern: string): string {
  if (keyOrPattern === 'homepage:full:v1') return 'homepage full';
  if (keyOrPattern.startsWith('homepage:')) return 'homepage';
  if (keyOrPattern.startsWith('carousel:')) return 'carousel';
  if (keyOrPattern.startsWith('categories:')) return 'categories';
  if (keyOrPattern.startsWith('brands:')) return 'brands';
  if (keyOrPattern.startsWith('products:list:')) return 'product list';
  if (keyOrPattern.startsWith('products:featured:')) return 'product list';
  if (keyOrPattern.startsWith('product:slug:')) return 'product detail';
  if (keyOrPattern.includes('*')) return getCacheGroup(keyOrPattern.replace('*', ''));
  return 'other';
}

function getCacheCounts(group: string): CacheMetricCounts {
  const existing = cacheMetrics.get(group);
  if (existing) return existing;

  const emptyCounts = CACHE_METRIC_NAMES.reduce((counts, metric) => {
    counts[metric] = 0;
    return counts;
  }, {} as CacheMetricCounts);

  cacheMetrics.set(group, emptyCounts);
  return emptyCounts;
}

export function recordCacheMetric(keyOrPattern: string, metric: CacheMetricName): void {
  if (!isPerfLoggingEnabled()) return;
  const group = getCacheGroup(keyOrPattern);
  getCacheCounts(group)[metric] += 1;
}

function snapshotCacheMetrics(): Record<string, CacheMetricCounts> {
  return Object.fromEntries(
    Array.from(cacheMetrics.entries()).map(([group, counts]) => [group, { ...counts }])
  );
}

function summarizeCacheMetrics(): void {
  if (!isPerfLoggingEnabled() || cacheMetrics.size === 0) return;
  logger.info({ cacheMetrics: snapshotCacheMetrics() }, 'Performance cache metrics summary');
}

function getQueryLabel(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const operation = normalized.match(/^(SELECT|INSERT|UPDATE|DELETE|WITH|LOCK|BEGIN|COMMIT|ROLLBACK)\b/i)?.[1]?.toUpperCase() || 'QUERY';
  const relation = normalized.match(/\b(?:FROM|INTO|UPDATE|JOIN|LOCK TABLE)\s+([a-zA-Z0-9_."]+)/i)?.[1];
  return relation ? `${operation} ${relation.replace(/"/g, '')}` : operation;
}

export function logSlowQuery(text: string, durationMs: number, rowCount: number | null | undefined): void {
  if (!isPerfLoggingEnabled()) return;

  const slowQueryMs = readNumberEnv('PERF_SLOW_QUERY_MS', 100);
  if (durationMs < slowQueryMs) return;

  logger.info({
    queryLabel: getQueryLabel(text),
    durationMs: roundMilliseconds(durationMs),
    rowCount: rowCount ?? null,
  }, 'Performance slow database query');
}

export function performanceRequestLogger(req: Request, res: Response, next: NextFunction): void {
  if (!isPerfLoggingEnabled()) {
    next();
    return;
  }

  startPerformanceBackgroundMonitors();

  const start = performance.now();
  res.on('finish', () => {
    const durationMs = performance.now() - start;
    const slowRequestMs = readNumberEnv('PERF_SLOW_REQUEST_MS', 500);

    if (durationMs < slowRequestMs) return;

    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: roundMilliseconds(durationMs),
      requestId: req.id,
      publicRead: isPublicReadRequest(req),
    }, 'Performance slow request');
  });

  next();
}

export function startPerformanceBackgroundMonitors(): void {
  if (!isPerfLoggingEnabled() || backgroundMonitorsStarted) return;
  backgroundMonitorsStarted = true;

  const eventLoopIntervalMs = readNumberEnv('PERF_EVENT_LOOP_LOG_INTERVAL_MS', 30_000);
  const cacheSummaryIntervalMs = readNumberEnv('PERF_CACHE_SUMMARY_INTERVAL_MS', 30_000);
  const eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
  eventLoopHistogram.enable();

  const eventLoopTimer = setInterval(() => {
    const memory = process.memoryUsage();

    logger.info({
      eventLoopDelayMs: {
        mean: millisecondsFromNanoseconds(eventLoopHistogram.mean),
        max: millisecondsFromNanoseconds(eventLoopHistogram.max),
        p95: millisecondsFromNanoseconds(eventLoopHistogram.percentile(95)),
      },
      memoryMb: {
        rss: Number((memory.rss / 1024 / 1024).toFixed(2)),
        heapUsed: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
        heapTotal: Number((memory.heapTotal / 1024 / 1024).toFixed(2)),
        external: Number((memory.external / 1024 / 1024).toFixed(2)),
      },
      uptimeSeconds: Number(process.uptime().toFixed(2)),
    }, 'Performance runtime metrics');

    eventLoopHistogram.reset();
  }, eventLoopIntervalMs);
  eventLoopTimer.unref();

  const cacheTimer = setInterval(summarizeCacheMetrics, cacheSummaryIntervalMs);
  cacheTimer.unref();

  process.once('beforeExit', () => {
    summarizeCacheMetrics();
    eventLoopHistogram.disable();
  });
}
