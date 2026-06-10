import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

process.env.NODE_ENV = 'test';
delete process.env.REDIS_URL;

describe('admin security monitoring endpoints', () => {
  let query: typeof import('../src/config/db').query;
  let hasAdminPermission: typeof import('../src/middleware/admin').hasAdminPermission;
  let buildSecurityAlerts: typeof import('../src/services/adminSecurity.service').buildSecurityAlerts;
  let getAdminSecurityHealth: typeof import('../src/services/adminSecurity.service').getAdminSecurityHealth;
  let getSecurityAlerts: typeof import('../src/services/adminSecurity.service').getSecurityAlerts;
  let listAdminSecurityEvents: typeof import('../src/services/adminSecurity.service').listAdminSecurityEvents;

  const createdUserIds: string[] = [];
  const createdEventIds: string[] = [];
  const emailPrefix = `security-monitoring-${Date.now()}`;

  async function createUser(role: string, label: string): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO users (email, name, role, email_verified_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [`${emailPrefix}-${label}@example.com`, `Security Monitoring ${label}`, role]
    );
    createdUserIds.push(rows[0].id);
    return rows[0].id;
  }

  async function createSecurityEvent(input: {
    eventType: string;
    severity: 'info' | 'warning' | 'high' | 'critical';
    userId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    const rows = await query<{ id: string }>(
      `INSERT INTO security_events (
         event_type, severity, user_id, ip_address, route, method, request_id, metadata
       )
       VALUES ($1, $2, $3, '127.0.0.1', '/api/v1/admin/security/events', 'GET', $4, $5::jsonb)
       RETURNING id`,
      [
        input.eventType,
        input.severity,
        input.userId || null,
        `${input.eventType}-${Date.now()}`,
        JSON.stringify(input.metadata || {}),
      ]
    );
    createdEventIds.push(rows[0].id);
    return rows[0].id;
  }

  before(async () => {
    ({ query } = await import('../src/config/db'));
    ({ hasAdminPermission } = await import('../src/middleware/admin'));
    ({
      buildSecurityAlerts,
      getAdminSecurityHealth,
      getSecurityAlerts,
      listAdminSecurityEvents,
    } = await import('../src/services/adminSecurity.service'));
  });

  after(async () => {
    if (createdEventIds.length > 0) {
      await query('DELETE FROM security_events WHERE id = ANY($1::uuid[])', [createdEventIds]);
    }
    if (createdUserIds.length > 0) {
      await query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
    }
  });

  it('security routes use existing admin stack and security permission', async () => {
    const adminRoutes = await readFile(join(process.cwd(), 'src/routes/admin.routes.ts'), 'utf8');

    assert.match(
      adminRoutes,
      /router\.use\(requireAuth\);\s*router\.use\(isAdmin\);\s*router\.use\(requireAdminMfa\);\s*router\.use\(adminReadLimiter\);/
    );
    assert.match(
      adminRoutes,
      /router\.get\('\/security\/health', requireAdminPermission\('security'\), adminSecurityController\.getSecurityHealth\)/
    );
    assert.match(
      adminRoutes,
      /router\.get\('\/security\/events', requireAdminPermission\('security'\), adminSecurityController\.getSecurityEvents\)/
    );
    assert.match(
      adminRoutes,
      /router\.get\('\/security\/alerts', requireAdminPermission\('security'\), adminSecurityController\.getSecurityAlertsController\)/
    );
  });

  it('only security-permission users can access monitoring endpoints', () => {
    assert.equal(hasAdminPermission({ role: 'super_admin' }, 'security'), true);
    assert.equal(hasAdminPermission({ role: 'admin' }, 'security'), false);
    assert.equal(hasAdminPermission({ role: 'manager' }, 'security'), false);
    assert.equal(hasAdminPermission({ role: 'support' }, 'security'), false);
    assert.equal(hasAdminPermission({ role: 'customer' }, 'security'), false);
  });

  it('health returns safe database and redis status without leaking secrets', async () => {
    const health = await getAdminSecurityHealth();
    const serialized = JSON.stringify(health).toLowerCase();

    assert.equal(health.api.status, 'ok');
    assert.equal(health.database.status, 'ok');
    assert.equal(health.redis.status, 'disabled');
    assert.equal(health.environment, 'test');
    assert.ok(health.lastCheckedAt);
    assert.doesNotMatch(serialized, /database_url|redis_url|postgres:\/\/|rediss?:\/\/|password|secret|token/);
  });

  it('events endpoint supports pagination and caps large limits', async () => {
    const actorId = await createUser('super_admin', 'pagination');
    const eventType = `test.monitoring.pagination.${Date.now()}`;
    await createSecurityEvent({ eventType, severity: 'warning', userId: actorId, metadata: { reason: 'one' } });
    await createSecurityEvent({ eventType, severity: 'warning', userId: actorId, metadata: { reason: 'two' } });
    await createSecurityEvent({ eventType, severity: 'warning', userId: actorId, metadata: { reason: 'three' } });

    const pageOne = await listAdminSecurityEvents({ eventType, page: 1, limit: 2 });
    const capped = await listAdminSecurityEvents({ eventType, page: 1, limit: 500 });

    assert.equal(pageOne.events.length, 2);
    assert.equal(pageOne.pagination.page, 1);
    assert.equal(pageOne.pagination.limit, 2);
    assert.equal(pageOne.pagination.total, 3);
    assert.equal(pageOne.pagination.totalPages, 2);
    assert.equal(capped.pagination.limit, 100);
  });

  it('events endpoint filters by severity and eventType', async () => {
    const eventType = `test.monitoring.filter.${Date.now()}`;
    await createSecurityEvent({ eventType, severity: 'high', metadata: { reason: 'matched' } });
    await createSecurityEvent({ eventType, severity: 'warning', metadata: { reason: 'not_matched' } });

    const result = await listAdminSecurityEvents({ eventType, severity: 'high' });

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].eventType, eventType);
    assert.equal(result.events[0].severity, 'high');
    assert.equal(result.events[0].metadataSummary.reason, 'matched');
  });

  it('events return whitelisted metadata summary without forbidden fields', async () => {
    const eventType = `test.monitoring.sanitized.${Date.now()}`;
    await createSecurityEvent({
      eventType,
      severity: 'critical',
      metadata: {
        reason: 'forbidden_field_check',
        limiter: 'sensitive-admin-action',
        password: 'plain-password',
        rawToken: 'raw-token',
        cookie: 'signed-cookie',
        sessionToken: 'session-token',
        mfaCode: '123456',
        secret: 'secret-value',
        rawPayload: { stack: 'stack-trace', token: 'payload-token' },
      },
    });

    const result = await listAdminSecurityEvents({ eventType });
    const event = result.events[0];
    const serialized = JSON.stringify(event).toLowerCase();

    assert.equal(event.metadataSummary.reason, 'forbidden_field_check');
    assert.equal(event.metadataSummary.limiter, 'sensitive-admin-action');
    assert.deepEqual(Object.keys(event.metadataSummary).sort(), ['limiter', 'reason']);
    assert.doesNotMatch(serialized, /plain-password|raw-token|signed-cookie|session-token|123456|secret-value|stack-trace|payload-token/);
    assert.doesNotMatch(serialized, /rawpayload|password|rawtoken|cookie|sessiontoken|mfacode|secret|stack/);
  });

  it('alerts builder returns no alerts for empty counts', () => {
    const alerts = buildSecurityAlerts(
      {
        failedMfa: 0,
        failedLogin: 0,
        sensitiveAdminActionRateLimit: 0,
        adminReadRateLimit: 0,
        uploadRejection: 0,
        checkoutSuspicious: 0,
        lastSuperAdminDenied: 0,
        roleChangeDenied: 0,
      },
      '15m',
      '2026-06-07T00:00:00.000Z'
    );

    assert.deepEqual(alerts, []);
  });

  it('alerts endpoint rejects invalid window values', async () => {
    await assert.rejects(
      () => getSecurityAlerts('7d'),
      (err: unknown) => {
        assert.equal((err as { statusCode?: number }).statusCode, 400);
        assert.match((err as Error).message, /invalid security alert window/i);
        return true;
      }
    );
  });

  it('failed MFA threshold creates a high auth alert', async () => {
    const eventType = 'auth.mfa_failed';
    for (let i = 0; i < 5; i += 1) {
      await createSecurityEvent({
        eventType,
        severity: 'warning',
        metadata: { reason: `mfa_failure_${i}` },
      });
    }

    const alerts = await getSecurityAlerts('15m');
    const alert = alerts.find((item) => item.id === 'auth-failed-mfa-15m');

    assert.ok(alert);
    assert.equal(alert.severity, 'high');
    assert.equal(alert.source, 'auth');
    assert.ok((alert.count || 0) >= 5);
  });

  it('sensitive admin action limiter hit creates a high alert', async () => {
    await createSecurityEvent({
      eventType: 'rate_limit.hit',
      severity: 'high',
      metadata: {
        limiter: 'sensitive-admin-action',
        password: 'should-not-leak',
        token: 'should-not-leak',
      },
    });

    const alerts = await getSecurityAlerts('1h');
    const alert = alerts.find((item) => item.id === 'rate-limit-sensitive-admin-action-1h');
    const serialized = JSON.stringify(alert).toLowerCase();

    assert.ok(alert);
    assert.equal(alert.severity, 'high');
    assert.equal(alert.source, 'rate_limit');
    assert.doesNotMatch(serialized, /should-not-leak|password|token|cookie|secret|mfacode|stack/);
  });

  it('last-super-admin denied event creates a critical alert', async () => {
    await createSecurityEvent({
      eventType: 'admin.last_super_admin_change_denied',
      severity: 'critical',
      metadata: { reason: 'last_super_admin' },
    });

    const alerts = await getSecurityAlerts('24h');
    const alert = alerts.find((item) => item.id === 'admin-security-last-super-admin-denied-24h');

    assert.ok(alert);
    assert.equal(alert.severity, 'critical');
    assert.equal(alert.source, 'admin_security');
  });

  it('alerts aggregate real security event names without exposing metadata payloads', async () => {
    for (let i = 0; i < 10; i += 1) {
      await createSecurityEvent({
        eventType: 'auth.login_failed',
        severity: 'warning',
        metadata: {
          reason: `login_failure_${i}`,
          rawPayload: { password: 'plain-password', token: 'raw-token' },
          mfaCode: '123456',
        },
      });
    }
    for (let i = 0; i < 3; i += 1) {
      await createSecurityEvent({
        eventType: 'admin.role_change_denied',
        severity: 'high',
        metadata: { reason: `role_denied_${i}`, cookie: 'signed-cookie' },
      });
    }

    const alerts = await getSecurityAlerts('15m');
    const loginAlert = alerts.find((item) => item.id === 'auth-failed-login-15m');
    const roleAlert = alerts.find((item) => item.id === 'admin-security-role-change-denied-15m');
    const serialized = JSON.stringify(alerts).toLowerCase();

    assert.ok(loginAlert);
    assert.equal(loginAlert.severity, 'high');
    assert.ok(roleAlert);
    assert.equal(roleAlert.severity, 'high');
    assert.doesNotMatch(serialized, /plain-password|raw-token|signed-cookie|123456/);
    assert.doesNotMatch(serialized, /rawpayload|password|token|cookie|mfacode|secret|stack/);
  });
});
