import { Request } from 'express';
import { query } from '../config/db';
import {
  hashIdentifier,
  logSecurityEvent,
  maskEmail,
  requestSecurityContext,
} from './securityEvent.service';
import { logger } from '../utils/logger';

const LOGIN_IDENTIFIER_THRESHOLD = 10;
const LOGIN_IP_THRESHOLD = 30;
const LOGIN_WINDOW_MINUTES = 30;
const LOGIN_COOLDOWN_MINUTES = 30;
const MFA_THRESHOLD = 5;
const MFA_WINDOW_MINUTES = 15;
const MFA_COOLDOWN_MINUTES = 15;

export const LOGIN_COOLDOWN_MESSAGE = 'Too many failed attempts. Please try again later.';
export const MFA_COOLDOWN_MESSAGE = 'Too many failed attempts. Please try again later.';

function getIp(req: Request): string | null {
  return requestSecurityContext(req).ipAddress || null;
}

export function getLoginIdentifierHash(email: string): string {
  return hashIdentifier(email);
}

async function countEvents(sql: string, values: unknown[]): Promise<number> {
  try {
    const rows = await query<{ count: string }>(sql, values);
    return parseInt(rows[0]?.count || '0', 10);
  } catch (err) {
    logger.warn({ err }, 'Failed to count progressive protection events');
    return 0;
  }
}

export async function isLoginCooldownActive(req: Request, emailHash: string): Promise<boolean> {
  const ip = getIp(req);
  const count = await countEvents(
    `SELECT COUNT(*) AS count
     FROM security_events
     WHERE event_type = 'auth.login_cooldown_triggered'
       AND created_at > NOW() - INTERVAL '${LOGIN_COOLDOWN_MINUTES} minutes'
       AND (
         metadata->>'emailHash' = $1
         OR ($2::text IS NOT NULL AND ip_address::text = $2)
       )`,
    [emailHash, ip]
  );

  if (count > 0) {
    void logSecurityEvent({
      ...requestSecurityContext(req),
      eventType: 'auth.login_blocked_cooldown',
      severity: 'high',
      metadata: { emailHash, reason: 'cooldown_active' },
    });
  }

  return count > 0;
}

export async function recordFailedLoginAttempt(req: Request, email: string): Promise<boolean> {
  const emailHash = getLoginIdentifierHash(email);
  const ip = getIp(req);

  await logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'auth.login_failed',
    severity: 'warning',
    metadata: {
      reason: 'invalid_credentials',
      emailHash,
      emailMasked: maskEmail(email),
    },
  });

  const identifierFailures = await countEvents(
    `SELECT COUNT(*) AS count
     FROM security_events
     WHERE event_type = 'auth.login_failed'
       AND created_at > NOW() - INTERVAL '${LOGIN_WINDOW_MINUTES} minutes'
       AND metadata->>'emailHash' = $1`,
    [emailHash]
  );

  const ipFailures = ip
    ? await countEvents(
      `SELECT COUNT(*) AS count
       FROM security_events
       WHERE event_type = 'auth.login_failed'
         AND created_at > NOW() - INTERVAL '${LOGIN_WINDOW_MINUTES} minutes'
         AND ip_address::text = $1`,
      [ip]
    )
    : 0;

  const identifierTriggered = identifierFailures >= LOGIN_IDENTIFIER_THRESHOLD;
  const ipTriggered = ipFailures >= LOGIN_IP_THRESHOLD;
  if (!identifierTriggered && !ipTriggered) return false;

  await logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'auth.login_cooldown_triggered',
    severity: 'high',
    metadata: {
      emailHash,
      emailMasked: maskEmail(email),
      reason: identifierTriggered ? 'identifier_threshold' : 'ip_threshold',
      identifierFailures,
      ipFailures,
      windowMinutes: LOGIN_WINDOW_MINUTES,
      cooldownMinutes: LOGIN_COOLDOWN_MINUTES,
    },
  });

  return true;
}

export async function isMfaCooldownActive(req: Request): Promise<boolean> {
  const userId = req.user?.id;
  if (!userId) return false;

  const count = await countEvents(
    `SELECT COUNT(*) AS count
     FROM security_events
     WHERE event_type = 'auth.mfa_cooldown_triggered'
       AND user_id = $1
       AND created_at > NOW() - INTERVAL '${MFA_COOLDOWN_MINUTES} minutes'`,
    [userId]
  );

  if (count > 0) {
    void logSecurityEvent({
      ...requestSecurityContext(req),
      eventType: 'auth.mfa_blocked_cooldown',
      severity: 'high',
      metadata: { reason: 'cooldown_active' },
    });
  }

  return count > 0;
}

export async function recordFailedMfaAttempt(req: Request, reason: string): Promise<boolean> {
  await logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'auth.mfa_failed',
    severity: 'high',
    metadata: { reason },
  });

  const userId = req.user?.id;
  if (!userId) return false;

  const failures = await countEvents(
    `SELECT COUNT(*) AS count
     FROM security_events
     WHERE event_type = 'auth.mfa_failed'
       AND user_id = $1
       AND created_at > NOW() - INTERVAL '${MFA_WINDOW_MINUTES} minutes'`,
    [userId]
  );

  if (failures < MFA_THRESHOLD) return false;

  await logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'auth.mfa_cooldown_triggered',
    severity: 'critical',
    metadata: {
      reason: 'mfa_threshold',
      failures,
      windowMinutes: MFA_WINDOW_MINUTES,
      cooldownMinutes: MFA_COOLDOWN_MINUTES,
    },
  });

  return true;
}

export async function requiresAdditionalVerification(): Promise<boolean> {
  return false;
}
