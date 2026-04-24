// backend/src/services/auth.service.ts
import { query } from '../config/db';
import { generateSessionToken } from '../utils/crypto';
import { env } from '../config/env';

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
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

// ─── Service Functions ───────────────────────────────────────────────────────

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

/**
 * Create a new session for a user.
 * Returns the session token (the value stored in the cookie).
 */
export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + env.COOKIE_MAX_AGE);

  await query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt.toISOString()]
  );

  return token;
}

/**
 * Validate a session token.
 * Returns the associated user if the session is valid and not expired, null otherwise.
 */
export async function validateSession(token: string): Promise<User | null> {
  const rows = await query<User & { session_id: string }>(
    `SELECT u.*, s.id AS session_id
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );

  if (rows.length === 0) return null;
  return rows[0];
}

/**
 * Destroy a session by its token (logout).
 */
export async function destroySession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

/**
 * Destroy all sessions for a user (force logout everywhere).
 */
export async function destroyAllUserSessions(userId: string): Promise<void> {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
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
