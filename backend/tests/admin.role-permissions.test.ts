import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NextFunction, Request, Response } from 'express';

process.env.NODE_ENV = 'test';
delete process.env.REDIS_URL;

describe('admin role mutation service hardening', () => {
  let query: typeof import('../src/config/db').query;
  let updateUserRole: typeof import('../src/services/admin.service').updateUserRole;
  let hasAdminPermission: typeof import('../src/middleware/admin').hasAdminPermission;
  let createSession: typeof import('../src/services/auth.service').createSession;
  let validateSession: typeof import('../src/services/auth.service').validateSession;
  let requireAdminMfa: typeof import('../src/middleware/mfa').requireAdminMfa;
  let requireFreshAdminMfa: typeof import('../src/middleware/mfa').requireFreshAdminMfa;
  let sanitizeSecurityMetadata: typeof import('../src/services/securityEvent.service').sanitizeSecurityMetadata;
  let logRateLimitHit: typeof import('../src/services/securityEvent.service').logRateLimitHit;
  let getAdminReadLimitForRole: typeof import('../src/middleware/rateLimiter').getAdminReadLimitForRole;
  let ADMIN_MUTATION_PRODUCTION_LIMIT: typeof import('../src/middleware/rateLimiter').ADMIN_MUTATION_PRODUCTION_LIMIT;
  let SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT: typeof import('../src/middleware/rateLimiter').SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT;
  let SENSITIVE_ADMIN_ACTION_DEVELOPMENT_LIMIT: typeof import('../src/middleware/rateLimiter').SENSITIVE_ADMIN_ACTION_DEVELOPMENT_LIMIT;
  let errorHandler: typeof import('../src/utils/errors').errorHandler;
  let ForbiddenError: typeof import('../src/utils/errors').ForbiddenError;
  const createdUserIds: string[] = [];
  const emailPrefix = `role-permission-${Date.now()}`;

  async function createUser(role: string, label: string): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO users (email, name, role, email_verified_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [`${emailPrefix}-${label}@example.com`, `Role Test ${label}`, role]
    );
    createdUserIds.push(rows[0].id);
    return rows[0].id;
  }

  async function withOnlyActiveSuperAdmin(superAdminId: string, fn: () => Promise<void>): Promise<void> {
    const otherSuperAdmins = await query<{ id: string }>(
      `SELECT id
       FROM users
       WHERE role = 'super_admin'
         AND deleted_at IS NULL
         AND id <> $1`,
      [superAdminId]
    );
    const otherSuperAdminIds = otherSuperAdmins.map((user) => user.id);

    if (otherSuperAdminIds.length > 0) {
      await query(
        `UPDATE users
         SET role = 'admin'
         WHERE id = ANY($1::uuid[])`,
        [otherSuperAdminIds]
      );
    }

    try {
      await fn();
    } finally {
      if (otherSuperAdminIds.length > 0) {
        await query(
          `UPDATE users
           SET role = 'super_admin'
           WHERE id = ANY($1::uuid[])`,
          [otherSuperAdminIds]
        );
      }
    }
  }

  async function latestSecurityEvent(eventType: string, userId: string): Promise<Record<string, any> | null> {
    const rows = await query<Record<string, any>>(
      `SELECT event_type, severity, user_id, metadata
       FROM security_events
       WHERE event_type = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [eventType, userId]
    );
    return rows[0] || null;
  }

  async function waitForSecurityEvent(eventType: string, userId: string): Promise<Record<string, any>> {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const event = await latestSecurityEvent(eventType, userId);
      if (event) return event;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Expected security event ${eventType} for user ${userId}`);
  }

  before(async () => {
    ({ query } = await import('../src/config/db'));
    ({ updateUserRole } = await import('../src/services/admin.service'));
    ({ hasAdminPermission } = await import('../src/middleware/admin'));
    ({ createSession, validateSession } = await import('../src/services/auth.service'));
    ({ requireAdminMfa, requireFreshAdminMfa } = await import('../src/middleware/mfa'));
    ({ sanitizeSecurityMetadata, logRateLimitHit } = await import('../src/services/securityEvent.service'));
    ({
      ADMIN_MUTATION_PRODUCTION_LIMIT,
      SENSITIVE_ADMIN_ACTION_DEVELOPMENT_LIMIT,
      SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT,
      getAdminReadLimitForRole,
    } = await import('../src/middleware/rateLimiter'));
    ({ errorHandler, ForbiddenError } = await import('../src/utils/errors'));
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
  });

  it('last active super_admin cannot be demoted to admin, manager, support, or customer', async () => {
    const actorId = await createUser('super_admin', 'last-super');

    await withOnlyActiveSuperAdmin(actorId, async () => {
      for (const role of ['admin', 'manager', 'support', 'customer']) {
        await assert.rejects(
          () => updateUserRole(actorId, role, actorId),
          /Cannot change the last active super admin/
        );

        const rows = await query<{ role: string }>('SELECT role FROM users WHERE id = $1', [actorId]);
        assert.equal(rows[0].role, 'super_admin');
      }
    });
  });

  it('denied last-super-admin attempt does not revoke target sessions', async () => {
    const actorId = await createUser('super_admin', 'last-super-session');
    const firstToken = await createSession(actorId, { userAgent: 'role-test-1' });
    const secondToken = await createSession(actorId, { userAgent: 'role-test-2' });

    await withOnlyActiveSuperAdmin(actorId, async () => {
      await assert.rejects(
        () => updateUserRole(actorId, 'admin', actorId),
        /Cannot change the last active super admin/
      );

      const event = await latestSecurityEvent('admin.last_super_admin_change_denied', actorId);
      assert.equal(event?.severity, 'critical');
      assert.equal(event?.metadata.reason, 'last_active_super_admin');
      const rows = await query<{ role: string }>('SELECT role FROM users WHERE id = $1', [actorId]);
      assert.equal(rows[0].role, 'super_admin');
      assert.equal((await validateSession(firstToken))?.id, actorId);
      assert.equal((await validateSession(secondToken))?.id, actorId);
    });
  });

  it('admin, manager, and support cannot update roles at the service layer', async () => {
    const targetId = await createUser('customer', 'target-denied');
    const adminId = await createUser('admin', 'admin-actor');
    const managerId = await createUser('manager', 'manager-actor');
    const supportId = await createUser('support', 'support-actor');

    for (const actorId of [adminId, managerId, supportId]) {
      await assert.rejects(
        () => updateUserRole(targetId, 'support', actorId),
        /Only super admins can change user roles/
      );

      const event = await latestSecurityEvent('admin.role_change_denied', actorId);
      assert.equal(event?.severity, 'high');
      assert.equal(event?.metadata.reason, 'actor_not_super_admin');
    }
  });

  it('if there are two active super_admins, one can be demoted by another super_admin', async () => {
    const actorId = await createUser('super_admin', 'super-actor');
    const targetId = await createUser('super_admin', 'target-super-demote');

    const updated = await updateUserRole(targetId, 'admin', actorId);

    assert.equal(updated.id, targetId);
    assert.equal(updated.role, 'admin');
  });

  it('super_admin can update another user role and revoke target sessions', async () => {
    const actorId = await createUser('super_admin', 'session-revoke-actor');
    const targetId = await createUser('manager', 'session-revoke-target');
    const firstToken = await createSession(targetId, { userAgent: 'role-test-target-1' });
    const secondToken = await createSession(targetId, { userAgent: 'role-test-target-2' });

    assert.equal((await validateSession(firstToken))?.id, targetId);
    assert.equal((await validateSession(secondToken))?.id, targetId);

    const updated = await updateUserRole(targetId, 'support', actorId);

    assert.equal(updated.id, targetId);
    assert.equal(updated.role, 'support');
    assert.equal(await validateSession(firstToken), null);
    assert.equal(await validateSession(secondToken), null);

    const requestedEvent = await latestSecurityEvent('admin.role_change_requested', actorId);
    assert.equal(requestedEvent?.metadata.targetUserId, targetId);
    assert.equal(requestedEvent?.metadata.newRole, 'support');

    const changedEvent = await latestSecurityEvent('admin.role_changed', actorId);
    assert.equal(changedEvent?.severity, 'high');
    assert.equal(changedEvent?.metadata.targetUserId, targetId);
    assert.equal(changedEvent?.metadata.oldRole, 'manager');
    assert.equal(changedEvent?.metadata.newRole, 'support');

    const revokedEvent = await latestSecurityEvent('admin.sessions_revoked_after_role_change', actorId);
    assert.equal(revokedEvent?.severity, 'high');
    assert.equal(revokedEvent?.metadata.sessionRevokedCount, 2);
  });

  it('self role change is rejected even for super_admin', async () => {
    const actorId = await createUser('super_admin', 'self-actor');
    await createUser('super_admin', 'self-companion');

    await assert.rejects(
      () => updateUserRole(actorId, 'admin', actorId),
      /cannot change your own role/i
    );

    const event = await latestSecurityEvent('admin.role_change_self_denied', actorId);
    assert.equal(event?.severity, 'high');
    assert.equal(event?.metadata.reason, 'self_role_change');
  });

  it('invalid role is rejected before mutation', async () => {
    const actorId = await createUser('super_admin', 'invalid-actor');
    const targetId = await createUser('customer', 'invalid-target');

    await assert.rejects(
      () => updateUserRole(targetId, 'owner', actorId),
      /Invalid role/
    );

    const event = await latestSecurityEvent('admin.role_change_denied', actorId);
    assert.equal(event?.severity, 'high');
    assert.equal(event?.metadata.reason, 'invalid_role');
    assert.equal(event?.metadata.newRole, 'owner');
  });

  it('role route uses admin_roles permission and customer routes use customers permission', async () => {
    const adminRoutes = await readFile(join(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');

    assert.match(
      adminRoutes,
      /router\.put\(\s*'\/users\/:id\/role',\s*requireAdminPermission\('admin_roles'\),\s*sensitiveAdminActionLimiter,\s*requireFreshAdminMfa\(10\),\s*adminController\.updateUserRole\s*\)/
    );
    assert.match(
      adminRoutes,
      /router\.get\('\/users', requireAdminPermission\('customers'\)/
    );
    assert.match(
      adminRoutes,
      /router\.get\('\/users\/:id', requireAdminPermission\('customers'\)/
    );
  });

  it('permission map separates customers from admin_roles', () => {
    assert.equal(hasAdminPermission({ role: 'super_admin' }, 'admin_roles'), true);
    assert.equal(hasAdminPermission({ role: 'super_admin' }, 'security'), true);
    assert.equal(hasAdminPermission({ role: 'super_admin' }, 'settings'), true);
    assert.equal(hasAdminPermission({ role: 'admin' }, 'admin_roles'), false);
    assert.equal(hasAdminPermission({ role: 'admin' }, 'security'), false);
    assert.equal(hasAdminPermission({ role: 'admin' }, 'settings'), false);
    assert.equal(hasAdminPermission({ role: 'support' }, 'customers'), true);
    assert.equal(hasAdminPermission({ role: 'manager' }, 'customers'), false);
    assert.equal(hasAdminPermission({ role: 'customer' }, 'analytics'), false);
  });

  it('homepage routes use homepage permission and carousel routes intentionally use content', async () => {
    const adminRoutes = await readFile(join(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');
    const carouselRoutes = await readFile(join(process.cwd(), 'src/routes/carousel.routes.ts'), 'utf8');

    assert.match(adminRoutes, /router\.get\('\/homepage', requireAdminPermission\('homepage'\)/);
    assert.match(adminRoutes, /router\.get\('\/homepage\/blocks', requireAdminPermission\('homepage'\)/);
    assert.match(adminRoutes, /router\.post\('\/homepage\/blocks', requireAdminPermission\('homepage'\)/);
    assert.doesNotMatch(adminRoutes, /requireAdminPermission\('users'\)/);
    assert.match(carouselRoutes, /requireAdminPermission\('content'\)/);
  });

  it('fresh MFA rejects role changes when MFA was never verified', async () => {
    const actorId = await createUser('super_admin', 'fresh-mfa-missing');
    const req = {
      user: {
        id: actorId,
        role: 'super_admin',
        mfa_enabled: true,
        session_id: '11111111-1111-4111-8111-111111111111',
        mfa_verified_at: null,
      },
      originalUrl: '/api/v1/admin/users/target/role',
      method: 'PUT',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      get: () => undefined,
    } as Partial<Request> as Request;

    const nextCall = await callMiddleware(requireFreshAdminMfa(10), req);

    assert.ok(nextCall.error instanceof Error);
    assert.equal(nextCall.error.message, 'Fresh MFA verification required');
    assert.equal((nextCall.error as { code?: string }).code, 'FRESH_MFA_REQUIRED');

    const event = await waitForSecurityEvent('admin.fresh_mfa_required', actorId);
    assert.equal(event.severity, 'warning');
    assert.equal(event.metadata.reason, 'missing_mfa_verified_at');
    assert.equal(event.metadata.maxAgeMinutes, 10);
  });

  it('fresh MFA rejects stale verification timestamps', async () => {
    const actorId = await createUser('super_admin', 'fresh-mfa-stale');
    const req = {
      user: {
        id: actorId,
        role: 'super_admin',
        mfa_enabled: true,
        session_id: '22222222-2222-4222-8222-222222222222',
        mfa_verified_at: new Date(Date.now() - 11 * 60 * 1000),
      },
      originalUrl: '/api/v1/admin/users/target/role',
      method: 'PUT',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      get: () => undefined,
    } as Partial<Request> as Request;

    const nextCall = await callMiddleware(requireFreshAdminMfa(10), req);

    assert.ok(nextCall.error instanceof Error);
    assert.equal(nextCall.error.message, 'Fresh MFA verification required');
    assert.equal((nextCall.error as { code?: string }).code, 'FRESH_MFA_REQUIRED');
  });

  it('fresh MFA allows recently verified sessions', async () => {
    const actorId = await createUser('super_admin', 'fresh-mfa-ok');
    const req = {
      user: {
        id: actorId,
        role: 'super_admin',
        mfa_enabled: true,
        session_id: '33333333-3333-4333-8333-333333333333',
        mfa_verified_at: new Date(),
      },
      originalUrl: '/api/v1/admin/users/target/role',
      method: 'PUT',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      get: () => undefined,
    } as Partial<Request> as Request;

    const nextCall = await callMiddleware(requireFreshAdminMfa(10), req);

    assert.equal(nextCall.error, undefined);
  });

  it('normal admin MFA middleware remains separate from fresh MFA', async () => {
    const req = {
      user: {
        id: '44444444-4444-4444-8444-444444444444',
        role: 'admin',
        mfa_enabled: false,
        mfa_verified_at: null,
      },
    } as Partial<Request> as Request;

    const nextCall = await callMiddleware(requireAdminMfa, req);

    assert.equal(nextCall.error, undefined);
  });

  it('customer read routes do not require fresh MFA', async () => {
    const adminRoutes = await readFile(join(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');

    assert.match(
      adminRoutes,
      /router\.get\('\/users', requireAdminPermission\('customers'\), adminController\.listUsers\)/
    );
    assert.doesNotMatch(
      adminRoutes,
      /router\.get\('\/users', requireAdminPermission\('customers'\), requireFreshAdminMfa/
    );
  });

  it('admin read limiter gives super_admin a higher production read budget', () => {
    assert.equal(getAdminReadLimitForRole('support', 'production'), 200);
    assert.equal(getAdminReadLimitForRole('manager', 'production'), 200);
    assert.equal(getAdminReadLimitForRole('admin', 'production'), 200);
    assert.equal(getAdminReadLimitForRole('super_admin', 'production'), 500);
    assert.equal(getAdminReadLimitForRole('customer', 'production'), 200);
    assert.equal(getAdminReadLimitForRole('admin', 'development'), 2000);
  });

  it('admin read limiter is mounted after admin auth and does not replace mutation limiter', async () => {
    const adminRoutes = await readFile(join(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');

    assert.match(
      adminRoutes,
      /router\.use\(requireAuth\);\s*router\.use\(isAdmin\);\s*router\.use\(requireAdminMfa\);\s*router\.use\(adminReadLimiter\);\s*router\.use\(adminMutationLimiter\);/
    );
    assert.match(adminRoutes, /adminMutationLimiter/);
    assert.match(adminRoutes, /adminReadLimiter/);
    assert.match(adminRoutes, /uploadLimiter/);
  });

  it('sensitive admin action limiter is exported and stricter than admin mutations', async () => {
    const rateLimiterSource = await readFile(join(process.cwd(), 'src/middleware/rateLimiter.ts'), 'utf8');

    assert.match(rateLimiterSource, /export const sensitiveAdminActionLimiter = createIdentityLimiter/);
    assert.equal(SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT, 15);
    assert.equal(SENSITIVE_ADMIN_ACTION_DEVELOPMENT_LIMIT, 100);
    assert.equal(ADMIN_MUTATION_PRODUCTION_LIMIT, 100);
    assert.ok(SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT < ADMIN_MUTATION_PRODUCTION_LIMIT);
    assert.ok(SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT < getAdminReadLimitForRole('super_admin', 'production'));
  });

  it('sensitive limiter applies only to role changes in admin routes', async () => {
    const adminRoutes = await readFile(join(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');
    const sensitiveLimiterUsages = adminRoutes.match(/sensitiveAdminActionLimiter/g) || [];

    assert.equal(sensitiveLimiterUsages.length, 2);
    assert.match(
      adminRoutes,
      /router\.put\(\s*'\/users\/:id\/role',\s*requireAdminPermission\('admin_roles'\),\s*sensitiveAdminActionLimiter,\s*requireFreshAdminMfa\(10\)/
    );
    assert.doesNotMatch(
      adminRoutes,
      /router\.get\([^)]*sensitiveAdminActionLimiter/
    );
  });

  it('auth and MFA routes keep the auth limiter unchanged', async () => {
    const authRoutes = await readFile(join(process.cwd(), 'src/routes/auth.routes.ts'), 'utf8');

    assert.match(authRoutes, /router\.post\('\/login', authLimiter/);
    assert.match(authRoutes, /router\.post\('\/mfa\/setup', authLimiter, requireAuth, setupMfa\)/);
    assert.match(authRoutes, /router\.post\('\/mfa\/verify', authLimiter, requireAuth/);
  });

  it('rate-limit hit logging includes admin-read limiter name and user role', async () => {
    const actorId = await createUser('super_admin', 'admin-read-limiter-log');
    const req = {
      user: {
        id: actorId,
        role: 'super_admin',
        session_id: '55555555-5555-4555-8555-555555555555',
      },
      originalUrl: '/api/v1/admin/homepage',
      method: 'GET',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      get: (header: string) => header === 'user-agent' ? 'admin-read-test' : undefined,
    } as Partial<Request> as Request;

    logRateLimitHit(req, 'admin-read', { role: 'super_admin', limit: 500 });

    const event = await waitForSecurityEvent('rate_limit.hit', actorId);
    assert.equal(event.metadata.limiter, 'admin-read');
    assert.equal(event.metadata.userRole, 'super_admin');
    assert.equal(event.metadata.role, 'super_admin');
    assert.equal(event.metadata.limit, 500);
  });

  it('rate-limit hit logging includes sensitive-admin-action limiter name', async () => {
    const actorId = await createUser('super_admin', 'sensitive-limiter-log');
    const req = {
      user: {
        id: actorId,
        role: 'super_admin',
        session_id: '66666666-6666-4666-8666-666666666666',
      },
      originalUrl: '/api/v1/admin/users/target/role',
      method: 'PUT',
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      get: (header: string) => header === 'user-agent' ? 'sensitive-limiter-test' : undefined,
    } as Partial<Request> as Request;

    logRateLimitHit(req, 'sensitive-admin-action', {
      role: 'super_admin',
      limit: SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT,
    });

    const event = await waitForSecurityEvent('rate_limit.hit', actorId);
    assert.equal(event.metadata.limiter, 'sensitive-admin-action');
    assert.equal(event.metadata.userRole, 'super_admin');
    assert.equal(event.metadata.limit, SENSITIVE_ADMIN_ACTION_PRODUCTION_LIMIT);
  });

  it('auth MFA controller has explicit fresh MFA success and failure security events', async () => {
    const authController = await readFile(join(process.cwd(), 'src/controllers/auth.controller.ts'), 'utf8');

    assert.match(authController, /admin\.fresh_mfa_verified/);
    assert.match(authController, /admin\.fresh_mfa_failed/);
    assert.match(authController, /reason: string/);
    assert.doesNotMatch(authController, /metadata:\s*\{[^}]*code[^}]*\}/);
  });

  it('fresh MFA error handler returns a stable code for frontend retry flow', () => {
    const err = new ForbiddenError('Fresh MFA verification required', 'FRESH_MFA_REQUIRED');
    const response = createJsonResponse();

    errorHandler(
      err,
      { originalUrl: '/api/v1/admin/users/target/role' } as Request,
      response as Response,
      (() => undefined) as NextFunction
    );

    assert.equal(response.statusCodeValue, 403);
    assert.deepEqual(response.jsonBody, {
      success: false,
      message: 'Fresh MFA verification required',
      code: 'FRESH_MFA_REQUIRED',
    });
  });

  it('security metadata sanitizer redacts MFA codes and secret-bearing fields', () => {
    const metadata = sanitizeSecurityMetadata({
      mfaCode: '123456',
      totp: '123456',
      password: 'secret-password',
      cookie: 'session-cookie',
      rawToken: 'raw-token',
      sessionRevokedCount: 2,
      nested: {
        sessionToken: 'nested-session-token',
        safeReason: 'invalid_code',
      },
    });

    assert.equal(metadata.mfaCode, '[redacted]');
    assert.equal(metadata.totp, '[redacted]');
    assert.equal(metadata.password, '[redacted]');
    assert.equal(metadata.cookie, '[redacted]');
    assert.equal(metadata.rawToken, '[redacted]');
    assert.equal(metadata.sessionRevokedCount, 2);
    assert.deepEqual(metadata.nested, {
      sessionToken: '[redacted]',
      safeReason: 'invalid_code',
    });
  });
});

async function callMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void | Promise<void>,
  req: Request
): Promise<{ error?: unknown }> {
  const result: { error?: unknown } = {};
  await middleware(req, {} as Response, ((error?: unknown) => {
    result.error = error;
  }) as NextFunction);
  return result;
}

function createJsonResponse(): Partial<Response> & { statusCodeValue: number; jsonBody: unknown } {
  const response: Partial<Response> & { statusCodeValue: number; jsonBody: unknown } = {
    statusCodeValue: 200,
    jsonBody: undefined,
  };

  response.status = ((statusCode: number) => {
    response.statusCodeValue = statusCode;
    return response as Response;
  }) as Response['status'];

  response.json = ((body: unknown) => {
    response.jsonBody = body;
    return response as Response;
  }) as Response['json'];

  return response;
}
