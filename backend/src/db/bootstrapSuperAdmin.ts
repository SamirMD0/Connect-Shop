import { query } from '../config/db';
import { hashPassword } from '../utils/crypto';
import { logger } from '../utils/logger';

interface BootstrapUser {
  id: string;
  email: string;
  role: string;
  deleted_at: Date | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requireBootstrapEmail(): string {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;

  if (!email?.trim()) {
    throw new Error('ADMIN_BOOTSTRAP_EMAIL is required.');
  }

  return normalizeEmail(email);
}

function getBootstrapPassword(): string | null {
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  return password?.trim() ? password : null;
}

function getBootstrapName(email: string): string {
  return process.env.ADMIN_BOOTSTRAP_NAME?.trim() || email.split('@')[0] || 'Super Admin';
}

async function getActiveSuperAdminCount(): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM users
     WHERE role = 'super_admin' AND deleted_at IS NULL`
  );

  return Number(rows[0]?.count || 0);
}

async function getUserByEmail(email: string): Promise<BootstrapUser | null> {
  const rows = await query<BootstrapUser>(
    `SELECT id, email, role, deleted_at
     FROM users
     WHERE email = $1`,
    [email]
  );

  return rows[0] || null;
}

async function promoteExistingUser(user: BootstrapUser): Promise<void> {
  if (user.deleted_at) {
    throw new Error('The bootstrap user exists but is deleted. Restore or create another user before bootstrapping.');
  }

  await query(
    `UPDATE users
     SET role = 'super_admin',
         email_verified_at = COALESCE(email_verified_at, NOW()),
         updated_at = NOW()
     WHERE id = $1`,
    [user.id]
  );

  await query(
    `UPDATE sessions
     SET revoked_at = COALESCE(revoked_at, NOW())
     WHERE user_id = $1`,
    [user.id]
  );
}

async function createSuperAdmin(email: string, password: string, name: string): Promise<void> {
  if (password.length < 12) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 characters long.');
  }

  await query(
    `INSERT INTO users (email, name, password_hash, role, email_verified_at)
     VALUES ($1, $2, $3, 'super_admin', NOW())`,
    [email, name, await hashPassword(password)]
  );
}

async function main(): Promise<void> {
  const email = requireBootstrapEmail();
  const password = getBootstrapPassword();
  const name = getBootstrapName(email);
  const existingSuperAdmins = await getActiveSuperAdminCount();
  const user = await getUserByEmail(email);

  if (existingSuperAdmins > 0) {
    if (user?.role === 'super_admin' && !user.deleted_at) {
      logger.info({ email }, 'Super admin bootstrap skipped; target user is already a super admin.');
      return;
    }

    throw new Error(
      'An active super admin already exists. Use the admin role-management workflow instead of bootstrap.'
    );
  }

  if (user) {
    await promoteExistingUser(user);
    logger.info({ email }, 'Existing user promoted to super admin and sessions were revoked.');
    return;
  }

  if (!password) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD is required when the bootstrap user does not exist.');
  }

  await createSuperAdmin(email, password, name);
  logger.info({ email }, 'Bootstrap super admin created.');
}

main().catch((error) => {
  logger.error({ err: error }, 'Super admin bootstrap failed');
  process.exit(1);
});

