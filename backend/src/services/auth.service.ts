// backend/src/services/auth.service.ts
import { query } from '../config/db';
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from '../utils/crypto';
import { env } from '../config/env';
import { ConflictError, UnauthorizedError, AppError } from '../utils/errors';
import { EmailService } from './email.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleProfile {
  sub: string;        // Google user ID
  email: string;
  name: string;
  picture?: string;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  phone?: string | null;
  password_hash?: string | null;
  email_verified_at?: Date | null;
  deleted_at?: Date | null;
  session_id?: string;
  mfa_enabled?: boolean;
  mfa_verified_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  created_at: Date;
  last_seen_at: Date;
  revoked_at: Date | null;
  mfa_verified_at: Date | null;
  is_current?: boolean;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface CredentialsRegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

// ─── Service Functions ───────────────────────────────────────────────────────

function isValidRawSessionToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{96}$/.test(token);
}

/**
 * Insert a new user or update their profile if already exists.
 * Returns the user record.
 */
export async function upsertUser(profile: GoogleProfile): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE SET
       email      = EXCLUDED.email,
       name       = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW()
     RETURNING *`,
    [profile.sub, profile.email, profile.name, profile.picture || null]
  );

  return rows[0];
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function createAuthToken(userId: string, purpose: 'email_verification' | 'password_reset', ttlMs: number): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlMs);

  await query(
    `INSERT INTO auth_tokens (user_id, token_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, purpose, expiresAt.toISOString()]
  );

  return token;
}

export async function createOAuthState(state: string, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);

  await query(
    `INSERT INTO oauth_states (state_hash, expires_at)
     VALUES ($1, $2)
     ON CONFLICT (state_hash) DO UPDATE SET
       expires_at = EXCLUDED.expires_at,
       used_at = NULL,
       created_at = NOW()`,
    [hashToken(state), expiresAt.toISOString()]
  );

  await query(`DELETE FROM oauth_states WHERE expires_at < NOW() - INTERVAL '1 day'`);
}

export async function consumeOAuthState(state: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE oauth_states
     SET used_at = NOW()
     WHERE state_hash = $1
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING id`,
    [hashToken(state)]
  );

  return rows.length > 0;
}

export async function registerWithPassword(input: CredentialsRegisterInput): Promise<User> {
  const email = normalizeEmail(input.email);
  const existing = await query<User>(
    `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [email]
  );

  if (existing.length > 0) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const rows = await query<User>(
    `INSERT INTO users (email, name, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email, input.name.trim(), input.phone?.trim() || null, passwordHash]
  );

  const token = await createAuthToken(rows[0].id, 'email_verification', 24 * 60 * 60 * 1000);
  await EmailService.sendEmailVerification(
    email,
    `${env.FRONTEND_URL}/auth/verify-email?token=${encodeURIComponent(token)}`
  );

  return rows[0];
}

export async function loginWithPassword(email: string, password: string): Promise<User> {
  const rows = await query<User>(
    `SELECT *
     FROM users
     WHERE email = $1 AND deleted_at IS NULL`,
    [normalizeEmail(email)]
  );

  const user = rows[0];
  if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return user;
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const rows = await query<{ user_id: string }>(
    `UPDATE auth_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND purpose = 'email_verification'
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(token)]
  );

  if (rows.length === 0) return false;

  await query(
    `UPDATE users
     SET email_verified_at = NOW()
     WHERE id = $1`,
    [rows[0].user_id]
  );

  return true;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const rows = await query<User>(
    `SELECT *
     FROM users
     WHERE email = $1 AND password_hash IS NOT NULL AND deleted_at IS NULL`,
    [normalizeEmail(email)]
  );

  if (rows[0]) {
    const token = await createAuthToken(rows[0].id, 'password_reset', 60 * 60 * 1000);
    await EmailService.sendPasswordReset(
      rows[0].email,
      `${env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(token)}`
    );
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const rows = await query<{ user_id: string }>(
    `UPDATE auth_tokens
     SET used_at = NOW()
     WHERE token_hash = $1
       AND purpose = 'password_reset'
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING user_id`,
    [hashToken(token)]
  );

  if (rows.length === 0) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  await query(
    `UPDATE users
     SET password_hash = $1
     WHERE id = $2`,
    [await hashPassword(password), rows[0].user_id]
  );

  await destroyAllUserSessions(rows[0].user_id);
}

/**
 * Create a new session for a user.
 * Returns the session token (the value stored in the cookie).
 */
export async function createSession(userId: string, metadata: SessionMetadata = {}): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.COOKIE_MAX_AGE);

  await query(
    `INSERT INTO sessions (user_id, token, expires_at, user_agent, ip_address, last_seen_at)
     VALUES ($1, $2, $3, $4, NULLIF($5, '')::inet, NOW())`,
    [userId, tokenHash, expiresAt.toISOString(), metadata.userAgent || null, metadata.ipAddress || '']
  );

  return token;
}

/**
 * Validate a session token.
 * Returns the associated user if the session is valid and not expired, null otherwise.
 */
export async function validateSession(token: string): Promise<User | null> {
  if (!isValidRawSessionToken(token)) {
    return null;
  }

  const tokenHash = hashToken(token);
  const rows = await query<User & { session_id: string }>(
    `SELECT u.*, s.id AS session_id, s.mfa_verified_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL`,
    [tokenHash]
  );

  if (rows.length === 0) return null;

  await query(
    `UPDATE sessions
     SET last_seen_at = NOW()
     WHERE id = $1 AND last_seen_at < NOW() - INTERVAL '5 minutes'`,
    [rows[0].session_id]
  );

  return rows[0];
}

/**
 * Revoke a session by its token (logout).
 * The hashed token remains in the sessions table with revoked_at set, so a
 * stolen cookie cannot be reused after logout and the revocation is auditable
 * until normal expired-session cleanup removes it.
 */
export async function destroySession(token: string): Promise<void> {
  if (!isValidRawSessionToken(token)) {
    return;
  }

  await query(
    `UPDATE sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE token = $1`,
    [hashToken(token)]
  );
}

/**
 * Revoke all sessions for a user (force logout everywhere).
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  await query(
    `UPDATE sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = $1`,
    [userId]
  );
}

export async function getUserSessions(userId: string, currentSessionId?: string): Promise<Session[]> {
  const rows = await query<Session>(
    `SELECT id, user_id, user_agent, ip_address::text, expires_at, created_at, last_seen_at, revoked_at, mfa_verified_at
     FROM sessions
     WHERE user_id = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL
     ORDER BY last_seen_at DESC, created_at DESC`,
    [userId]
  );

  return rows.map((session) => ({
    ...session,
    is_current: session.id === currentSessionId,
  }));
}

export async function revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [sessionId, userId]
  );

  return rows.length > 0;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE sessions
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId]
  );

  return rows.length;
}

/**
 * Clean up expired sessions from the database.
 * Returns the number of deleted sessions.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const rows = await query<{ cleanup_expired_sessions: number }>(
    'SELECT cleanup_expired_sessions() AS cleanup_expired_sessions'
  );
  return rows[0]?.cleanup_expired_sessions ?? 0;
}
