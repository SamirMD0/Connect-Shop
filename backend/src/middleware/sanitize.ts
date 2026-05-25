import { Request, Response, NextFunction } from 'express';

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'csrfToken',
  'code',
  'secret',
  'state',
]);

function sanitizeValue(value: unknown, key = ''): unknown {
  if (typeof value === 'string') {
    const normalized = value.normalize('NFC').replace(CONTROL_CHARS, '');
    return SENSITIVE_KEYS.has(key) ? normalized : normalized.trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }

  if (value && typeof value === 'object') {
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      (value as Record<string, unknown>)[childKey] = sanitizeValue(childValue, childKey);
    }
  }

  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  sanitizeValue(req.body);
  sanitizeValue(req.query);
  sanitizeValue(req.params);
  next();
}
