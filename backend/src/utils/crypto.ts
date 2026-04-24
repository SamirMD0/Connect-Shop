// backend/src/utils/crypto.ts
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random session token.
 * Returns a 96-character hex string (48 bytes of entropy).
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(48).toString('hex');
}
