import { env } from '../config/env';
import { query } from '../config/db';
import { redisClient, redisEnabled } from '../config/redis';
import { sanitizeSecurityMetadata, SecurityEventSeverity } from './securityEvent.service';
import { AppError } from '../utils/errors';

type HealthStatus = 'ok' | 'down';
type RedisHealthStatus = 'ok' | 'disabled' | 'down';
export type AdminSecurityAlertWindow = '15m' | '1h' | '24h';
export type AdminSecurityAlertSeverity = 'critical' | 'high' | 'warning' | 'info';

interface SecurityAlertCounts {
  failedMfa: number;
  failedLogin: number;
  sensitiveAdminActionRateLimit: number;
  adminReadRateLimit: number;
  uploadRejection: number;
  checkoutSuspicious: number;
  lastSuperAdminDenied: number;
  roleChangeDenied: number;
}

export interface AdminSecurityHealth {
  api: {
    status: 'ok';
    checkedAt: string;
  };
  database: {
    status: HealthStatus;
    latencyMs?: number;
  };
  redis: {
    status: RedisHealthStatus;
    latencyMs?: number;
  };
  environment: string;
  lastCheckedAt: string;
}

export interface AdminSecurityEvent {
  id: string;
  eventType: string;
  severity: SecurityEventSeverity;
  userId: string | null;
  route: string | null;
  method: string | null;
  requestId: string | null;
  ipAddress: string | null;
  metadataSummary: Record<string, unknown>;
  createdAt: string;
}

export interface AdminSecurityEventFilters {
  page?: number;
  limit?: number;
  severity?: string;
  eventType?: string;
  from?: string;
  to?: string;
}

export interface AdminSecurityEventList {
  events: AdminSecurityEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminSecurityAlert {
  id: string;
  severity: AdminSecurityAlertSeverity;
  source: string;
  title: string;
  message: string;
  count?: number;
  window: AdminSecurityAlertWindow;
  suggestedAction: string;
  createdAt: string;
}

const SEVERITIES = new Set<SecurityEventSeverity>(['info', 'warning', 'high', 'critical']);
const MAX_EVENTS_LIMIT = 100;
const DEFAULT_EVENTS_LIMIT = 25;
const ALERT_WINDOWS = new Set<AdminSecurityAlertWindow>(['15m', '1h', '24h']);
const METADATA_SUMMARY_KEYS = new Set([
  'reason',
  'limiter',
  'userRole',
  'role',
  'actorId',
  'actorRole',
  'targetUserId',
  'targetEmailMasked',
  'targetCurrentRole',
  'oldRole',
  'newRole',
  'maxAgeMinutes',
  'sessionRevokedCount',
  'emailMasked',
  'source',
  'statusCode',
  'limit',
]);

function parsePositiveInteger(value: unknown, fallback: number, max?: number): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max ? Math.min(parsed, max) : parsed;
}

function parseDateFilter(value: string | undefined, field: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field} date filter`, 400);
  }
  return date;
}

function sanitizeEventType(value: string | undefined): string | undefined {
  const eventType = value?.trim();
  if (!eventType) return undefined;
  if (eventType.length > 100 || !/^[a-z0-9_.:-]+$/i.test(eventType)) {
    throw new AppError('Invalid eventType filter', 400);
  }
  return eventType;
}

function parseAlertWindow(value: unknown): AdminSecurityAlertWindow {
  if (value === undefined || value === null || value === '') return '15m';
  const window = String(value);
  if (!ALERT_WINDOWS.has(window as AdminSecurityAlertWindow)) {
    throw new AppError('Invalid security alert window', 400);
  }
  return window as AdminSecurityAlertWindow;
}

function getAlertWindowInterval(window: AdminSecurityAlertWindow): string {
  switch (window) {
    case '15m':
      return '15 minutes';
    case '1h':
      return '1 hour';
    case '24h':
      return '24 hours';
    default:
      return '15 minutes';
  }
}

function toCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : parseInt(String(value || '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeSecurityMetadata(metadata: unknown): Record<string, unknown> {
  const sanitized = sanitizeSecurityMetadata(metadata);
  const summary: Record<string, unknown> = {};

  for (const key of METADATA_SUMMARY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      summary[key] = sanitized[key];
    }
  }

  return summary;
}

export function buildSecurityAlerts(
  counts: SecurityAlertCounts,
  window: AdminSecurityAlertWindow,
  createdAt = new Date().toISOString()
): AdminSecurityAlert[] {
  const alerts: AdminSecurityAlert[] = [];
  const addAlert = (input: Omit<AdminSecurityAlert, 'createdAt' | 'window'>) => {
    alerts.push({
      ...input,
      window,
      createdAt,
    });
  };

  if (counts.failedMfa >= 5) {
    addAlert({
      id: `auth-failed-mfa-${window}`,
      severity: 'high',
      source: 'auth',
      title: 'Failed MFA spike',
      message: `${counts.failedMfa} MFA verification failures were recorded in the selected window.`,
      count: counts.failedMfa,
      suggestedAction: 'Review affected accounts and IP addresses, then consider temporary access restrictions if failures continue.',
    });
  }

  if (counts.failedLogin >= 10) {
    addAlert({
      id: `auth-failed-login-${window}`,
      severity: 'high',
      source: 'auth',
      title: 'Failed login spike',
      message: `${counts.failedLogin} failed login attempts were recorded in the selected window.`,
      count: counts.failedLogin,
      suggestedAction: 'Review login failure patterns and confirm progressive protection is blocking abusive clients.',
    });
  }

  if (counts.sensitiveAdminActionRateLimit >= 1) {
    addAlert({
      id: `rate-limit-sensitive-admin-action-${window}`,
      severity: 'high',
      source: 'rate_limit',
      title: 'Sensitive admin action rate limit hit',
      message: 'A sensitive admin action limiter was triggered.',
      count: counts.sensitiveAdminActionRateLimit,
      suggestedAction: 'Review recent role and security-control attempts immediately.',
    });
  }

  if (counts.adminReadRateLimit >= 3) {
    addAlert({
      id: `rate-limit-admin-read-${window}`,
      severity: 'warning',
      source: 'rate_limit',
      title: 'Admin dashboard read rate-limit spike',
      message: `${counts.adminReadRateLimit} admin dashboard read rate-limit hits were recorded.`,
      count: counts.adminReadRateLimit,
      suggestedAction: 'Check for dashboard refetch loops, repeated refreshes, or abusive admin sessions.',
    });
  }

  if (counts.uploadRejection >= 5) {
    addAlert({
      id: `upload-rejection-${window}`,
      severity: 'warning',
      source: 'upload',
      title: 'Upload rejection spike',
      message: `${counts.uploadRejection} upload rejections were recorded in the selected window.`,
      count: counts.uploadRejection,
      suggestedAction: 'Review rejected upload types and sizes, then confirm upload validation and ImageKit settings.',
    });
  }

  if (counts.checkoutSuspicious >= 5) {
    addAlert({
      id: `checkout-suspicious-${window}`,
      severity: 'warning',
      source: 'checkout',
      title: 'Suspicious checkout activity',
      message: `${counts.checkoutSuspicious} suspicious checkout or COD events were recorded.`,
      count: counts.checkoutSuspicious,
      suggestedAction: 'Review recent COD/order activity and confirm rate limits are working as expected.',
    });
  }

  if (counts.lastSuperAdminDenied >= 1) {
    addAlert({
      id: `admin-security-last-super-admin-denied-${window}`,
      severity: 'critical',
      source: 'admin_security',
      title: 'Last super admin protection triggered',
      message: 'An attempt to change the last active super admin was blocked.',
      count: counts.lastSuperAdminDenied,
      suggestedAction: 'Investigate the role-management attempt and verify super admin account ownership.',
    });
  }

  if (counts.roleChangeDenied >= 3) {
    addAlert({
      id: `admin-security-role-change-denied-${window}`,
      severity: 'high',
      source: 'admin_security',
      title: 'Role change denial spike',
      message: `${counts.roleChangeDenied} denied role-change attempts were recorded.`,
      count: counts.roleChangeDenied,
      suggestedAction: 'Review admin privilege attempts and verify only approved super admins can manage roles.',
    });
  }

  return alerts.sort((a, b) => {
    const rank: Record<AdminSecurityAlertSeverity, number> = {
      critical: 0,
      high: 1,
      warning: 2,
      info: 3,
    };
    return rank[a.severity] - rank[b.severity] || a.title.localeCompare(b.title);
  });
}

export async function getAdminSecurityHealth(): Promise<AdminSecurityHealth> {
  const checkedAt = new Date().toISOString();
  const database: AdminSecurityHealth['database'] = { status: 'down' };
  const redis: AdminSecurityHealth['redis'] = { status: redisEnabled ? 'down' : 'disabled' };

  try {
    const start = Date.now();
    await query('SELECT 1 AS ok');
    database.status = 'ok';
    database.latencyMs = Date.now() - start;
  } catch {
    database.status = 'down';
  }

  if (redisEnabled && redisClient) {
    try {
      const start = Date.now();
      await redisClient.ping();
      redis.status = 'ok';
      redis.latencyMs = Date.now() - start;
    } catch {
      redis.status = 'down';
    }
  }

  return {
    api: {
      status: 'ok',
      checkedAt,
    },
    database,
    redis,
    environment: env.NODE_ENV,
    lastCheckedAt: checkedAt,
  };
}

export async function getSecurityAlerts(windowValue?: unknown): Promise<AdminSecurityAlert[]> {
  const window = parseAlertWindow(windowValue);
  const interval = getAlertWindowInterval(window);

  const rows = await query<SecurityAlertCounts>(
    `SELECT
       (COUNT(*) FILTER (WHERE event_type IN ('auth.mfa_failed', 'admin.fresh_mfa_failed')))::int AS "failedMfa",
       (COUNT(*) FILTER (WHERE event_type = 'auth.login_failed'))::int AS "failedLogin",
       (COUNT(*) FILTER (
         WHERE event_type = 'rate_limit.hit'
           AND metadata->>'limiter' = 'sensitive-admin-action'
       ))::int AS "sensitiveAdminActionRateLimit",
       (COUNT(*) FILTER (
         WHERE event_type = 'rate_limit.hit'
           AND metadata->>'limiter' = 'admin-read'
       ))::int AS "adminReadRateLimit",
       (COUNT(*) FILTER (WHERE event_type = 'upload.rejected'))::int AS "uploadRejection",
       (COUNT(*) FILTER (
         WHERE event_type IN ('checkout.cod_blocked_pending_orders', 'checkout.invalid_attempt')
       ))::int AS "checkoutSuspicious",
       (COUNT(*) FILTER (WHERE event_type = 'admin.last_super_admin_change_denied'))::int AS "lastSuperAdminDenied",
       (COUNT(*) FILTER (
         WHERE event_type IN ('admin.role_change_denied', 'admin.role_change_self_denied')
       ))::int AS "roleChangeDenied"
     FROM security_events
     WHERE created_at >= NOW() - $1::interval`,
    [interval]
  );

  const counts = rows[0] || {
    failedMfa: 0,
    failedLogin: 0,
    sensitiveAdminActionRateLimit: 0,
    adminReadRateLimit: 0,
    uploadRejection: 0,
    checkoutSuspicious: 0,
    lastSuperAdminDenied: 0,
    roleChangeDenied: 0,
  };

  return buildSecurityAlerts(
    {
      failedMfa: toCount(counts.failedMfa),
      failedLogin: toCount(counts.failedLogin),
      sensitiveAdminActionRateLimit: toCount(counts.sensitiveAdminActionRateLimit),
      adminReadRateLimit: toCount(counts.adminReadRateLimit),
      uploadRejection: toCount(counts.uploadRejection),
      checkoutSuspicious: toCount(counts.checkoutSuspicious),
      lastSuperAdminDenied: toCount(counts.lastSuperAdminDenied),
      roleChangeDenied: toCount(counts.roleChangeDenied),
    },
    window
  );
}

export async function listAdminSecurityEvents(filters: AdminSecurityEventFilters = {}): Promise<AdminSecurityEventList> {
  const page = parsePositiveInteger(filters.page, 1);
  const limit = parsePositiveInteger(filters.limit, DEFAULT_EVENTS_LIMIT, MAX_EVENTS_LIMIT);
  const offset = (page - 1) * limit;
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.severity) {
    if (!SEVERITIES.has(filters.severity as SecurityEventSeverity)) {
      throw new AppError('Invalid severity filter', 400);
    }
    params.push(filters.severity);
    where.push(`severity = $${params.length}`);
  }

  const eventType = sanitizeEventType(filters.eventType);
  if (eventType) {
    params.push(eventType);
    where.push(`event_type = $${params.length}`);
  }

  const from = parseDateFilter(filters.from, 'from');
  if (from) {
    params.push(from.toISOString());
    where.push(`created_at >= $${params.length}`);
  }

  const to = parseDateFilter(filters.to, 'to');
  if (to) {
    params.push(to.toISOString());
    where.push(`created_at <= $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countRows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM security_events ${whereSql}`,
    params
  );
  const total = parseInt(countRows[0]?.count || '0', 10);

  const eventRows = await query<{
    id: string;
    eventType: string;
    severity: SecurityEventSeverity;
    userId: string | null;
    route: string | null;
    method: string | null;
    requestId: string | null;
    ipAddress: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
  }>(
    `SELECT id,
            event_type AS "eventType",
            severity,
            user_id AS "userId",
            route,
            method,
            request_id AS "requestId",
            ip_address::text AS "ipAddress",
            metadata,
            created_at AS "createdAt"
     FROM security_events
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    events: eventRows.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      severity: event.severity,
      userId: event.userId,
      route: event.route,
      method: event.method,
      requestId: event.requestId,
      ipAddress: event.ipAddress,
      metadataSummary: summarizeSecurityMetadata(event.metadata),
      createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : String(event.createdAt),
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
