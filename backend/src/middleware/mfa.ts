import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import { getMfaRequiredForAdmin } from '../services/mfa.service';
import { query } from '../config/db';
import { logSecurityEvent, requestSecurityContext } from '../services/securityEvent.service';

const FRESH_MFA_ERROR_CODE = 'FRESH_MFA_REQUIRED';

function parseMfaTimestamp(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getSessionMfaVerifiedAt(sessionId: string, userId: string): Promise<Date | null> {
  const rows = await query<{ mfa_verified_at: Date | null }>(
    `SELECT mfa_verified_at
     FROM sessions
     WHERE id = $1
       AND user_id = $2
       AND revoked_at IS NULL
       AND expires_at > NOW()`,
    [sessionId, userId]
  );

  return parseMfaTimestamp(rows[0]?.mfa_verified_at);
}

function logFreshMfaRequired(req: Request, reason: string, maxAgeMinutes: number): void {
  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'admin.fresh_mfa_required',
    severity: 'warning',
    metadata: { reason, maxAgeMinutes },
  });
}

export function requireAdminMfa(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.user) {
      throw new ForbiddenError('Access denied: Authentication required');
    }

    if (getMfaRequiredForAdmin(req.user)) {
      throw new ForbiddenError('Admin MFA verification required');
    }

    next();
  } catch (err) {
    next(err);
  }
}

export function requireFreshAdminMfa(maxAgeMinutes = 10) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('Access denied: Authentication required');
      }

      if (!req.user.mfa_enabled) {
        logFreshMfaRequired(req, 'mfa_not_enabled', maxAgeMinutes);
        throw new ForbiddenError('Fresh MFA verification required', FRESH_MFA_ERROR_CODE);
      }

      if (!req.user.session_id) {
        logFreshMfaRequired(req, 'missing_session_id', maxAgeMinutes);
        throw new ForbiddenError('Fresh MFA verification required', FRESH_MFA_ERROR_CODE);
      }

      const userTimestamp = parseMfaTimestamp(req.user.mfa_verified_at);
      const verifiedAt = userTimestamp || await getSessionMfaVerifiedAt(req.user.session_id, req.user.id);

      if (!verifiedAt) {
        logFreshMfaRequired(req, 'missing_mfa_verified_at', maxAgeMinutes);
        throw new ForbiddenError('Fresh MFA verification required', FRESH_MFA_ERROR_CODE);
      }

      const maxAgeMs = maxAgeMinutes * 60 * 1000;
      if (Date.now() - verifiedAt.getTime() > maxAgeMs) {
        logFreshMfaRequired(req, 'stale_mfa_verified_at', maxAgeMinutes);
        throw new ForbiddenError('Fresh MFA verification required', FRESH_MFA_ERROR_CODE);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
