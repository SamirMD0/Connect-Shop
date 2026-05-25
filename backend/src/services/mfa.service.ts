import crypto from 'crypto';
import { query } from '../config/db';
import { env } from '../config/env';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

interface MfaRecord {
  email: string;
  mfa_enabled: boolean;
  mfa_secret: string | null;
}

export interface MfaSetup {
  secret: string;
  otpauthUrl: string;
}

function toBase32(buffer: Buffer): string {
  let bits = '';
  let output = '';

  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return output;
}

function fromBase32(secret: string): Buffer {
  const normalized = secret.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';

  for (const char of normalized) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) throw new Error('Invalid MFA secret');
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret: string, timeStep: number): string {
  const key = fromBase32(secret);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function verifyTotp(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);

  for (let offset = -1; offset <= 1; offset += 1) {
    if (generateTotp(secret, currentStep + offset) === code) {
      return true;
    }
  }

  return false;
}

async function getMfaRecord(userId: string): Promise<MfaRecord | null> {
  const rows = await query<MfaRecord>(
    `SELECT email, mfa_enabled, mfa_secret
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return rows[0] || null;
}

export async function createMfaSetup(userId: string): Promise<MfaSetup> {
  const existing = await getMfaRecord(userId);
  const secret = existing?.mfa_secret || toBase32(crypto.randomBytes(20));

  await query(
    `UPDATE users
     SET mfa_secret = $1
     WHERE id = $2`,
    [secret, userId]
  );

  const issuer = encodeURIComponent('ElecSHOP');
  const label = encodeURIComponent(`ElecSHOP:${existing?.email || userId}`);

  return {
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`,
  };
}

export async function verifyMfaCode(userId: string, sessionId: string, code: string): Promise<boolean> {
  const record = await getMfaRecord(userId);
  if (!record?.mfa_secret || !verifyTotp(record.mfa_secret, code)) {
    return false;
  }

  await query(
    `UPDATE users
     SET mfa_enabled = TRUE,
         mfa_confirmed_at = COALESCE(mfa_confirmed_at, NOW())
     WHERE id = $1`,
    [userId]
  );

  await query(
    `UPDATE sessions
     SET mfa_verified_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [sessionId, userId]
  );

  return true;
}

export function getMfaRequiredForAdmin(user: { role: string; mfa_enabled?: boolean; mfa_verified_at?: Date | null }): boolean {
  if (env.NODE_ENV === 'test') return false;
  return ['support', 'manager', 'admin', 'super_admin'].includes(user.role) && (!user.mfa_enabled || !user.mfa_verified_at);
}
