export class PublicReadTimeoutError extends Error {
  constructor() { super('The catalog took too long to respond. Please retry.'); this.name = 'PublicReadTimeoutError'; }
}

export function isPublicStorefrontRead(endpoint: string, method: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  const path = endpoint.split('?')[0];
  // Match current public routes explicitly. In particular /carousel/admin is
  // authenticated despite sharing the public carousel namespace.
  return ['/api/v1/store/config', '/api/v1/products', '/api/v1/categories', '/api/v1/brands', '/api/v1/carousel',
    '/api/v1/homepage', '/api/v1/homepage/full'].includes(path)
    || /^\/api\/v1\/products\/[^/]+(?:\/questions)?$/.test(path);
}

export function publicReadTimeoutMs(): number {
  const value = Number(process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS || '5000');
  return Number.isFinite(value) && value > 0 ? Math.min(Math.ceil(value), 30000) : 5000;
}

// Covers headers AND body consumption. Race also bounds fetch implementations that
// ignore abort; the signal cancels native fetch/body streams where supported.
export async function withPublicReadDeadline<T>(
  load: (signal: AbortSignal) => Promise<T>,
  callerSignal?: AbortSignal | null,
  timeoutMs = publicReadTimeoutMs(),
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const stopped = new Promise<never>((_, reject) => {
    onAbort = () => {
      const reason = callerSignal?.reason ?? new DOMException('Aborted', 'AbortError');
      controller.abort(reason);
      reject(reason);
    };
    if (callerSignal?.aborted) { onAbort(); return; }
    callerSignal?.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(() => {
      const error = new PublicReadTimeoutError();
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    if (controller.signal.aborted) return await stopped;
    return await Promise.race([load(controller.signal), stopped]);
  } finally {
    clearTimeout(timer);
    if (onAbort) callerSignal?.removeEventListener('abort', onAbort);
  }
}

export function homepageCatalogUnavailable(partialFailures: readonly string[] = []): boolean {
  return partialFailures.some((section) => ['featuredProducts', 'trendingProducts', 'categories'].includes(section));
}
