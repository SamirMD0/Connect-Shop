import crypto from 'crypto';
import { Request } from 'express';
import { query } from '../config/db';
import { logger } from '../utils/logger';

export type SecurityEventSeverity = 'info' | 'warning' | 'high' | 'critical';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /accessToken/i,
  /refreshToken/i,
  /session/i,
  /cookie/i,
  /authorization/i,
  /csrf/i,
  /privateKey/i,
  /secret/i,
  /^file$/i,
  /base64/i,
  /imageData/i,
  /dataUrl/i,
];
const MAX_STRING_LENGTH = 300;
const MAX_ARRAY_ITEMS = 10;
const MAX_OBJECT_KEYS = 25;
const MAX_DEPTH = 3;

export interface SecurityEventInput {
  eventType: string;
  severity?: SecurityEventSeverity;
  userId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  route?: string | null;
  method?: string | null;
  requestId?: string | null;
  metadata?: unknown;
}

function getClientIp(req: Request): string | null {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim() || null;
  }

  return req.ip || req.socket.remoteAddress || null;
}

function getRequestId(req: Request): string | null {
  return String(req.id || req.get('x-request-id') || '').slice(0, 100) || null;
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}...`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return '[buffer omitted]';
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return '[array omitted]';
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) return '[object omitted]';

    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value).slice(0, MAX_OBJECT_KEYS)) {
      sanitized[key] = isSensitiveKey(key) ? '[redacted]' : sanitizeValue(nestedValue, depth + 1);
    }
    return sanitized;
  }

  return String(value);
}

export function sanitizeSecurityMetadata(metadata: unknown): Record<string, unknown> {
  const sanitized = sanitizeValue(metadata || {}, 0);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : { value: sanitized };
}

export function hashIdentifier(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex').slice(0, 16);
}

export function maskEmail(email: unknown): string | undefined {
  if (typeof email !== 'string') return undefined;
  const [name, domain] = email.trim().toLowerCase().split('@');
  if (!name || !domain) return undefined;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: unknown): string | undefined {
  if (typeof phone !== 'string') return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return undefined;
  return `***${digits.slice(-4)}`;
}

export function requestSecurityContext(req: Request): Omit<SecurityEventInput, 'eventType' | 'metadata' | 'severity'> {
  return {
    userId: req.user?.id || null,
    sessionId: req.user?.session_id || null,
    ipAddress: getClientIp(req),
    userAgent: req.get('user-agent') || null,
    route: req.originalUrl?.split('?')[0] || req.path || null,
    method: req.method || null,
    requestId: getRequestId(req),
  };
}

export async function logSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    await query(
      `INSERT INTO security_events (
         event_type, severity, user_id, session_id, ip_address, user_agent,
         route, method, request_id, metadata
       )
       VALUES ($1, $2, $3, $4, NULLIF($5, '')::inet, $6, $7, $8, $9, $10::jsonb)`,
      [
        input.eventType,
        input.severity || 'info',
        input.userId || null,
        input.sessionId || null,
        input.ipAddress || '',
        input.userAgent || null,
        input.route || null,
        input.method || null,
        input.requestId || null,
        JSON.stringify(sanitizeSecurityMetadata(input.metadata)),
      ]
    );
  } catch (err) {
    logger.warn({ err, eventType: input.eventType }, 'Failed to write security event');
  }
}

export function logFailedLogin(req: Request, metadata: Record<string, unknown> = {}): void {
  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'auth.login_failed',
    severity: 'warning',
    metadata,
  });
}

export function logRateLimitHit(req: Request, limiter: string): void {
  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'rate_limit.hit',
    severity: 'warning',
    metadata: { limiter },
  });
}

export function logCheckoutBlocked(req: Request, reason: string, metadata: Record<string, unknown> = {}): void {
  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: reason === 'active_cod_order_limit'
      ? 'checkout.cod_blocked_pending_orders'
      : 'checkout.invalid_attempt',
    severity: reason === 'active_cod_order_limit' ? 'high' : 'warning',
    metadata: { reason, ...metadata },
  });
}

export function logUploadRejected(req: Request, reason: string, metadata: Record<string, unknown> = {}): void {
  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'upload.rejected',
    severity: reason === 'oversized' ? 'high' : 'warning',
    metadata: { reason, ...metadata },
  });
}

export function logAdminSuspiciousAction(req: Request, reason: string, metadata: Record<string, unknown> = {}): void {
  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'admin.suspicious_action',
    severity: 'warning',
    metadata: { reason, ...metadata },
  });
}
