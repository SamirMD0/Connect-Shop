import { API_URL } from './constants';

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

function getVersionedEndpoint(endpoint: string): string {
  return endpoint.startsWith('/api/') ? endpoint.replace('/api/', '/api/v1/') : endpoint;
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

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for cookies (session auth)
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 403 && UNSAFE_METHODS.has(method)) {
      csrfToken = null;
    }

    const message = (isJson && data.message) ? data.message : response.statusText;
    const code = isJson && typeof data.code === 'string' ? data.code : undefined;
    throw new ApiError(response.status, message, code);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    fetchWrapper<T>(endpoint, { ...options, method: 'DELETE' }),
};
