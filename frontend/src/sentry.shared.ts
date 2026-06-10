import type { ErrorEvent } from '@sentry/nextjs';

const SENSITIVE_KEY_PATTERN = /password|passcode|authorization|cookie|csrf|token|secret|session|mfa|otp/i;
const MAX_SANITIZE_DEPTH = 5;

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_SANITIZE_DEPTH) return '[MaxDepth]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? '[Filtered]'
      : sanitizeValue(nestedValue, depth + 1);
  }
  return sanitized;
}

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    sanitized[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[Filtered]' : value;
  }
  return sanitized;
}

export function getClientTracesSampleRate(): number {
  return process.env.NODE_ENV === 'production' ? 0.1 : 0;
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const sanitized: ErrorEvent = { ...event };

  if (sanitized.request) {
    sanitized.request = {
      ...sanitized.request,
      cookies: undefined,
      data: sanitizeValue(sanitized.request.data),
      headers: sanitizeHeaders(sanitized.request.headers),
      query_string: typeof sanitized.request.query_string === 'string'
        ? sanitized.request.query_string
        : undefined,
    };
  }

  if (sanitized.user) {
    sanitized.user = {
      id: sanitized.user.id,
    };
  }

  if (sanitized.extra) {
    sanitized.extra = sanitizeValue(sanitized.extra) as Record<string, unknown>;
  }

  return sanitized;
}
