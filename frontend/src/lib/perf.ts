export function isPerfLoggingEnabled(): boolean {
  return typeof window === 'undefined' && process.env.PERF_LOGGING_ENABLED === 'true';
}

function roundMilliseconds(value: number): number {
  return Number(value.toFixed(2));
}

function getSlowFetchThresholdMs(): number {
  const parsed = Number(process.env.PERF_SLOW_FETCH_MS || process.env.PERF_SLOW_REQUEST_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
}

function getSlowRenderThresholdMs(): number {
  const parsed = Number(process.env.PERF_SLOW_RENDER_MS || process.env.PERF_SLOW_REQUEST_MS);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 500;
}

function sanitizeEndpoint(endpoint: string): string {
  const [path] = endpoint.split('?');
  return path || endpoint;
}

export function logServerFetchTiming(input: {
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
}): void {
  if (!isPerfLoggingEnabled() || input.durationMs < getSlowFetchThresholdMs()) return;

  console.info('[perf][frontend][fetch]', {
    endpoint: sanitizeEndpoint(input.endpoint),
    method: input.method,
    status: input.status,
    durationMs: roundMilliseconds(input.durationMs),
  });
}

// Measure the complete aggregate operation, including response parsing and failures.
// Unlike slow-fetch logs, baseline mode records warm responses below the threshold.
export async function measureHomepageAggregateRequest<T>(load: () => Promise<T>): Promise<T> {
  if (!isPerfLoggingEnabled()) return load();

  const startedAt = performance.now();
  let outcome: 'success' | 'failed' = 'failed';
  try {
    const result = await load();
    outcome = 'success';
    return result;
  } finally {
    console.info('[perf][frontend][homepage-aggregate]', {
      endpoint: '/api/v1/homepage/full',
      outcome,
      durationMs: roundMilliseconds(performance.now() - startedAt),
    });
  }
}

export function logServerRenderTiming(input: {
  pageType: string;
  phase: string;
  durationMs: number;
}): void {
  if (!isPerfLoggingEnabled() || input.durationMs < getSlowRenderThresholdMs()) return;

  console.info('[perf][frontend][render]', {
    pageType: input.pageType,
    phase: input.phase,
    durationMs: roundMilliseconds(input.durationMs),
  });
}
