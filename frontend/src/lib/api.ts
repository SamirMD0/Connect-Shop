import { API_URL } from './constants';
import { logServerFetchTiming } from './perf';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SSR_SECRET_HEADER = 'x-connect-shop-ssr-secret';
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

function getVersionedEndpoint(endpoint: string): string {
  return endpoint.startsWith('/api/') ? endpoint.replace('/api/', '/api/v1/') : endpoint;
}

function isServerSidePublicRead(versionedEndpoint: string, method: string): boolean {
  if (typeof window !== 'undefined') return false;
  if (method !== 'GET' && method !== 'HEAD') return false;

  const path = versionedEndpoint.split('?')[0];

  return path === '/api/v1/homepage'
    || path === '/api/v1/homepage/full'
    || path.startsWith('/api/v1/homepage/')
    || path === '/api/v1/products'
    || path.startsWith('/api/v1/products/')
    || path === '/api/v1/categories'
    || path.startsWith('/api/v1/categories/')
    || path === '/api/v1/brands'
    || path.startsWith('/api/v1/brands/')
    || path === '/api/v1/carousel';
}

function addInternalSsrSecretHeader(headers: Headers, versionedEndpoint: string, method: string) {
  if (!isServerSidePublicRead(versionedEndpoint, method)) return;
  if (headers.has(SSR_SECRET_HEADER)) return;

  const ssrSecret = process.env.INTERNAL_SSR_API_SECRET;
  if (!ssrSecret) return;

  headers.set(SSR_SECRET_HEADER, ssrSecret);
}

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(`${API_URL}/api/v1/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new ApiError(response.status, response.statusText);
        }

        const data = await response.json() as { csrfToken: string };
        csrfToken = data.csrfToken;
        return data.csrfToken;
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
}

async function fetchWrapper<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const versionedEndpoint = getVersionedEndpoint(endpoint);
  let url = `${API_URL}${versionedEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const method = options.method?.toUpperCase() ?? 'GET';

  if (UNSAFE_METHODS.has(method) && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', await fetchCsrfToken());
  }

  addInternalSsrSecretHeader(headers, versionedEndpoint, method);

  const fetchStart = performance.now();
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for cookies (session auth)
  });
  logServerFetchTiming({
    endpoint: versionedEndpoint,
    method,
    status: response.status,
    durationMs: performance.now() - fetchStart,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 403 && UNSAFE_METHODS.has(method)) {
      csrfToken = null;
    }

    const message = (
      isJson
      && typeof data === 'object'
      && data !== null
      && 'message' in data
      && typeof data.message === 'string'
    ) ? data.message : response.statusText;
    const code = (
      isJson
      && typeof data === 'object'
      && data !== null
      && 'code' in data
      && typeof data.code === 'string'
    ) ? data.code : undefined;
    throw new ApiError(response.status, message, code);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'DELETE' }),
};
