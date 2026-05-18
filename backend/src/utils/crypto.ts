// backend/src/utils/crypto.ts
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * Generate a cryptographically secure random session token.
 * Returns a 96-character hex string (48 bytes of entropy).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Generate a short-lived token for browser security handshakes such as OAuth
 * state and CSRF double-submit validation.
 */
export function generateBrowserToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash bearer-style tokens before persistence. The raw token is only sent to
 * the browser; the database stores this keyed digest.
 */
export function hashToken(token: string): string {
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [scheme, salt, storedKey] = passwordHash.split('$');
  if (scheme !== 'scrypt' || !salt || !storedKey) return false;

  const key = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });

  return crypto.timingSafeEqual(Buffer.from(storedKey, 'hex'), key);
}
