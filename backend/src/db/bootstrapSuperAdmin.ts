import { pool, query } from '../config/db';
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

function getBootstrapEmail(): string | null {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;
  return email?.trim() ? normalizeEmail(email) : null;
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
  await query(
    `INSERT INTO users (email, name, password_hash, role, email_verified_at)
     VALUES ($1, $2, $3, 'super_admin', NOW())`,
    [email, name, await hashPassword(password)]
  );
}

const MIN_BOOTSTRAP_PASSWORD_LENGTH = 12;

/**
 * Idempotent by design so it can run on every deployment:
 *  - never creates a second account for the same email
 *  - never resets an existing administrator's password
 *  - skips (exit 0) whenever there is nothing to bootstrap
 *
 * Every bootstrap *configuration* problem is a loud warning and a clean exit, never a
 * failed deployment: refusing to start the server would not create the administrator,
 * it would only take the site down. Exit 1 is reserved for database/operational
 * failures, which are the cases where continuing really is unsafe.
 */
async function main(): Promise<void> {
  const email = getBootstrapEmail();

  if (!email) {
    logger.info('Super admin bootstrap skipped; ADMIN_BOOTSTRAP_EMAIL is not set.');
    return;
  }

  const password = getBootstrapPassword();
  const name = getBootstrapName(email);
  const existingSuperAdmins = await getActiveSuperAdminCount();
  const user = await getUserByEmail(email);

  if (existingSuperAdmins > 0) {
    if (user?.role === 'super_admin' && !user.deleted_at) {
      logger.info({ email }, 'Super admin bootstrap skipped; target user is already a super admin.');
      return;
    }

    // Nothing to bootstrap: the system already has an administrator. Promoting another
    // account here is the admin role-management workflow's job.
    logger.warn(
      { email },
      'Super admin bootstrap skipped; an active super admin already exists. Use the admin role-management workflow to grant additional access.'
    );
    return;
  }

  if (user) {
    if (user.deleted_at) {
      logger.warn(
        { email },
        'Super admin bootstrap skipped; the bootstrap user exists but is deleted. Restore that user, or point ADMIN_BOOTSTRAP_EMAIL at another account.'
      );
      return;
    }

    await promoteExistingUser(user);
    logger.info({ email }, 'Existing user promoted to super admin and sessions were revoked.');
    return;
  }

  if (!password) {
    logger.warn(
      { email },
      'Super admin bootstrap skipped; no super admin exists and ADMIN_BOOTSTRAP_PASSWORD is not set. Set it to create the first administrator.'
    );
    return;
  }

  if (password.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    logger.warn(
      { email, minimumLength: MIN_BOOTSTRAP_PASSWORD_LENGTH },
      'Super admin bootstrap skipped; ADMIN_BOOTSTRAP_PASSWORD is too short.'
    );
    return;
  }

  await createSuperAdmin(email, password, name);
  logger.info({ email }, 'Bootstrap super admin created.');
}

main()
  .then(async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  })
  .catch(async (error) => {
    logger.error({ err: error }, 'Super admin bootstrap failed');
    await pool.end().catch(() => undefined);
    process.exit(1);
  });

