// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction, CookieOptions } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { getCrossSiteCookieSecurityOptions } from '../config/cookies';
import {
  upsertUser,
  createSession,
  destroySession,
  destroyAllUserSessions,
  GoogleProfile,
  getUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
  registerWithPassword,
  loginWithPassword,
  verifyEmailToken,
  requestPasswordReset,
  resetPassword,
  createOAuthState,
  consumeOAuthState,
} from '../services/auth.service';
import { AppError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { generateBrowserToken } from '../utils/crypto';
import { issueCsrfToken } from '../middleware/csrf';
import { createMfaSetup, verifyMfaCode } from '../services/mfa.service';
import {
  logSecurityEvent,
  maskEmail,
  requestSecurityContext,
} from '../services/securityEvent.service';
import { logger } from '../utils/logger';
import {
  getLoginIdentifierHash,
  isLoginCooldownActive,
  isMfaCooldownActive,
  LOGIN_COOLDOWN_MESSAGE,
  MFA_COOLDOWN_MESSAGE,
  recordFailedLoginAttempt,
  recordFailedMfaAttempt,
} from '../services/progressiveProtection.service';

const oauthClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_CALLBACK_URL
);

// Cookie configuration
const COOKIE_NAME = 'elecshop_session';
const OAUTH_STATE_COOKIE_NAME = 'elecshop_oauth_state';
const OAUTH_STATE_MAX_AGE = 10 * 60 * 1000;

function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip;
}

function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    ...getCrossSiteCookieSecurityOptions(env.NODE_ENV),
    maxAge: env.COOKIE_MAX_AGE,
    path: '/',
    signed: true,
  };
}

function getOAuthStateCookieSecurityOptions(): Pick<CookieOptions, 'secure' | 'sameSite'> {
  const callbackUrl = new URL(env.GOOGLE_CALLBACK_URL);
  const isHttpsCallback = callbackUrl.protocol === 'https:';

  return isHttpsCallback
    ? { secure: true, sameSite: 'none' }
    : getCrossSiteCookieSecurityOptions(env.NODE_ENV);
}

function getOAuthStateCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    ...getOAuthStateCookieSecurityOptions(),
    maxAge: OAUTH_STATE_MAX_AGE,
    path: '/',
    signed: true,
  };
}

function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE_NAME, {
    httpOnly: true,
    ...getOAuthStateCookieSecurityOptions(),
    path: '/',
  });
}

function rejectOAuthState(req: Request, res: Response, reason: string): never {
  clearOAuthStateCookie(res);

  logger.warn({
    reason,
    hasStateParam: typeof req.query.state === 'string',
    hasRawStateCookie: Boolean(req.cookies?.[OAUTH_STATE_COOKIE_NAME]),
    hasSignedStateCookie: typeof req.signedCookies?.[OAUTH_STATE_COOKIE_NAME] === 'string',
    signedStateCookieRejected: req.signedCookies?.[OAUTH_STATE_COOKIE_NAME] === false,
  }, 'Invalid OAuth state');

  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType: 'auth.oauth_state_invalid',
    severity: 'warning',
    metadata: { reason },
  });

  throw new AppError('Invalid OAuth state', 400);
}

function isAdminMfaUser(req: Request): boolean {
  return ['support', 'manager', 'admin', 'super_admin'].includes(req.user?.role || '');
}

function logAdminFreshMfaEvent(
  req: Request,
  eventType: 'admin.fresh_mfa_verified' | 'admin.fresh_mfa_failed',
  severity: 'info' | 'warning' | 'high',
  reason: string
): void {
  if (!isAdminMfaUser(req)) return;

  void logSecurityEvent({
    ...requestSecurityContext(req),
    eventType,
    severity,
    metadata: { reason },
  });
}

/**
 * GET /api/auth/google
 * Redirect user to Google OAuth consent screen.
 */
export async function googleLogin(_req: Request, res: Response): Promise<void> {
  const state = generateBrowserToken();
  await createOAuthState(state, OAUTH_STATE_MAX_AGE);

  res.cookie(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());

  const authorizeUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    state,
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });

  res.redirect(authorizeUrl);
}

function assertPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new AppError('Password must be between 8 and 128 characters', 400);
  }

  return password;
}

function assertEmail(email: unknown): string {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AppError('Valid email is required', 400);
  }

  return email;
}

async function setSessionForUser(req: Request, res: Response, userId: string): Promise<void> {
  await destroyAllUserSessions(userId);
  const sessionToken = await createSession(userId, {
    userAgent: req.get('user-agent'),
    ipAddress: getClientIp(req),
  });

  res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions());
}

/**
 * GET /api/auth/google/callback
 * Handle the OAuth callback from Google.
 * Exchange code for tokens, get user profile, create session, set cookie, redirect.
 */
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.query;
    const state = req.query.state;
    const expectedState = req.signedCookies?.[OAUTH_STATE_COOKIE_NAME];

    if (!code || typeof code !== 'string') {
      throw new AppError('Missing authorization code', 400);
    }

    if (!state || typeof state !== 'string') {
      rejectOAuthState(req, res, 'missing_state_param');
    }

    if (expectedState === false) {
      rejectOAuthState(req, res, 'invalid_state_cookie_signature');
    }

    if (!expectedState || typeof expectedState !== 'string') {
      rejectOAuthState(req, res, 'missing_state_cookie');
    }

    if (state !== expectedState) {
      rejectOAuthState(req, res, 'state_cookie_mismatch');
    }

    if (!(await consumeOAuthState(state))) {
      rejectOAuthState(req, res, 'state_not_found_expired_or_consumed');
    }

    clearOAuthStateCookie(res);

    // Exchange authorization code for tokens
    const { tokens } = await oauthClient.getToken(code);

    if (!tokens.id_token) {
      throw new AppError('Failed to obtain ID token from Google', 500);
    }

    // Verify the ID token and extract user info
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email || !payload.name) {
      throw new AppError('Invalid token payload from Google', 500);
    }

    const profile: GoogleProfile = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    // Upsert user in database
    const user = await upsertUser(profile);

    await setSessionForUser(req, res, user.id);

    // Redirect to frontend
    res.redirect(`${env.FRONTEND_URL}/auth/callback?success=true`);
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = assertEmail(req.body.email);
    const password = assertPassword(req.body.password);
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    if (!name || name.length > 255) {
      throw new AppError('Name is required and must be under 255 characters', 400);
    }

    const user = await registerWithPassword({
      email,
      password,
      name,
      phone: typeof req.body.phone === 'string' ? req.body.phone : undefined,
    });

    await setSessionForUser(req, res, user.id);

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
        phone: user.phone || null,
        emailVerified: Boolean(user.email_verified_at),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const email = assertEmail(req.body.email);
    const password = assertPassword(req.body.password);
    const emailHash = getLoginIdentifierHash(email);

    if (await isLoginCooldownActive(req, emailHash)) {
      throw new AppError(LOGIN_COOLDOWN_MESSAGE, 429);
    }

    const user = await loginWithPassword(email, password);
    await setSessionForUser(req, res, user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url,
        role: user.role,
        phone: user.phone || null,
        emailVerified: Boolean(user.email_verified_at),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError && typeof req.body.email === 'string') {
      const cooldownTriggered = await recordFailedLoginAttempt(req, req.body.email);
      if (cooldownTriggered) {
        return next(new AppError(LOGIN_COOLDOWN_MESSAGE, 429));
      }
    }

    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    if (!token) throw new AppError('Verification token is required', 400);

    const verified = await verifyEmailToken(token);
    if (!verified) throw new AppError('Invalid or expired verification token', 400);

    res.json({ success: true, message: 'Email verified' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await requestPasswordReset(assertEmail(req.body.email));
    res.json({ success: true, message: 'If an account exists, a reset link has been sent' });
  } catch (err) {
    void logSecurityEvent({
      ...requestSecurityContext(req),
      eventType: 'auth.password_reset_failed',
      severity: 'warning',
      metadata: {
        reason: 'invalid_request',
        emailHash: typeof req.body.email === 'string' ? getLoginIdentifierHash(req.body.email) : undefined,
        emailMasked: maskEmail(req.body.email),
      },
    });
    next(err);
  }
}

export async function handleResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    if (!token) throw new AppError('Reset token is required', 400);

    await resetPassword(token, assertPassword(req.body.password));
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    void logSecurityEvent({
      ...requestSecurityContext(req),
      eventType: 'auth.password_reset_failed',
      severity: 'warning',
      metadata: { reason: 'invalid_or_expired_token' },
    });
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Return the currently authenticated user (from session cookie).
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  // user is attached by optionalAuth or requireAuth middleware
  const user = (req as any).user;

  if (!user) {
    res.json({ success: true, user: null });
    return;
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      role: user.role,
      phone: user.phone || null,
      emailVerified: Boolean(user.email_verified_at),
      mfaEnabled: Boolean(user.mfa_enabled),
      mfaVerified: Boolean(user.mfa_verified_at),
    },
  });
}

/**
 * GET /api/auth/csrf
 * Issue a CSRF token for unsafe cookie-authenticated requests.
 */
export async function getCsrfToken(_req: Request, res: Response): Promise<void> {
  const csrfToken = issueCsrfToken(res);

  res.json({
    success: true,
    csrfToken,
  });
}

/**
 * GET /api/auth/sessions
 * List the authenticated user's active sessions.
 */
export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await getUserSessions(req.user!.id, req.user!.session_id);
    res.json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/auth/sessions/:id
 * Revoke one active session for the authenticated user.
 */
export async function revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const revoked = await revokeUserSession(req.user!.id, req.params.id);
    if (!revoked) throw new NotFoundError('Session');
    res.json({ success: true, message: 'Session revoked' });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/auth/sessions
 * Revoke every active session for the authenticated user.
 */
export async function revokeAllSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const revokedCount = await revokeAllUserSessions(req.user!.id);
    res.json({ success: true, revokedCount });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/mfa/setup
 * Generate or return an admin user's TOTP setup secret.
 */
export async function setupMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!['support', 'manager', 'admin', 'super_admin'].includes(req.user!.role)) {
      throw new ForbiddenError('MFA setup is only required for admin accounts');
    }

    if (req.user!.mfa_enabled) {
      throw new ForbiddenError('MFA is already configured for this account');
    }

    const setup = await createMfaSetup(req.user!.id);
    res.json({ success: true, ...setup });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/mfa/verify
 * Verify a TOTP code and mark the current session as MFA-verified.
 */
export async function verifyMfa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (await isMfaCooldownActive(req)) {
      logAdminFreshMfaEvent(req, 'admin.fresh_mfa_failed', 'warning', 'cooldown_active');
      throw new AppError(MFA_COOLDOWN_MESSAGE, 429);
    }

    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

    if (!/^\d{6}$/.test(code)) {
      const cooldownTriggered = await recordFailedMfaAttempt(req, 'invalid_format');
      logAdminFreshMfaEvent(
        req,
        'admin.fresh_mfa_failed',
        cooldownTriggered ? 'high' : 'warning',
        'invalid_format'
      );
      if (cooldownTriggered) {
        throw new AppError(MFA_COOLDOWN_MESSAGE, 429);
      }
      throw new AppError('MFA code must be 6 digits', 400);
    }

    const verified = await verifyMfaCode(req.user!.id, req.user!.session_id!, code);
    if (!verified) {
      const cooldownTriggered = await recordFailedMfaAttempt(req, 'invalid_code');
      logAdminFreshMfaEvent(
        req,
        'admin.fresh_mfa_failed',
        cooldownTriggered ? 'high' : 'warning',
        'invalid_code'
      );
      if (cooldownTriggered) {
        throw new AppError(MFA_COOLDOWN_MESSAGE, 429);
      }
      throw new ForbiddenError('Invalid MFA code');
    }

    logAdminFreshMfaEvent(req, 'admin.fresh_mfa_verified', 'info', 'totp_verified');
    res.json({ success: true, message: 'MFA verified' });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Destroy the session and clear the cookie.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.signedCookies[COOKIE_NAME];

    if (token) {
      await destroySession(token);
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      ...getCrossSiteCookieSecurityOptions(env.NODE_ENV),
      path: '/',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}
