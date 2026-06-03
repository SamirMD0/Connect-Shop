import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { CookieOptions, NextFunction, Request, Response } from 'express';

process.env.NODE_ENV = 'test';

type CookieRecord = {
  value: string;
  options: CookieOptions;
};

type TestResponse = Partial<Response> & {
  statusCodeValue: number;
  cookies: Map<string, CookieRecord>;
  clearedCookies: Map<string, CookieOptions>;
  jsonBody: unknown;
};

function createResponse(): TestResponse {
  const response: TestResponse = {
    statusCodeValue: 200,
    cookies: new Map(),
    clearedCookies: new Map(),
    jsonBody: undefined,
  };

  response.status = ((statusCode: number) => {
    response.statusCodeValue = statusCode;
    return response as Response;
  }) as Response['status'];

  response.cookie = ((name: string, value: string, options: CookieOptions) => {
    response.cookies.set(name, { value, options });
    return response as Response;
  }) as Response['cookie'];

  response.clearCookie = ((name: string, options: CookieOptions) => {
    response.clearedCookies.set(name, options);
    return response as Response;
  }) as Response['clearCookie'];

  response.json = ((body: unknown) => {
    response.jsonBody = body;
    return response as Response;
  }) as Response['json'];

  return response;
}

async function callNext(): Promise<{ next: NextFunction; error?: unknown }> {
  const result: { error?: unknown } = {};
  return {
    next: ((error?: unknown) => {
      result.error = error;
    }) as NextFunction,
    get error() {
      return result.error;
    },
  };
}

describe('auth session invalidation', () => {
  let query: typeof import('../src/config/db').query;
  let pool: typeof import('../src/config/db').pool;
  let hashPassword: typeof import('../src/utils/crypto').hashPassword;
  let hashToken: typeof import('../src/utils/crypto').hashToken;
  let createSession: typeof import('../src/services/auth.service').createSession;
  let destroySession: typeof import('../src/services/auth.service').destroySession;
  let destroyAllUserSessions: typeof import('../src/services/auth.service').destroyAllUserSessions;
  let validateSession: typeof import('../src/services/auth.service').validateSession;
  let login: typeof import('../src/controllers/auth.controller').login;
  let logout: typeof import('../src/controllers/auth.controller').logout;
  let requireAuth: typeof import('../src/middleware/auth').requireAuth;
  let userId: string;
  const email = `session-test-${Date.now()}@example.com`;
  const password = 'SessionTestPassword123!';

  before(async () => {
    ({ query, pool } = await import('../src/config/db'));
    ({ hashPassword, hashToken } = await import('../src/utils/crypto'));
    ({ createSession, destroySession, destroyAllUserSessions, validateSession } = await import('../src/services/auth.service'));
    ({ login, logout } = await import('../src/controllers/auth.controller'));
    ({ requireAuth } = await import('../src/middleware/auth'));

    const rows = await query<{ id: string }>(
      `INSERT INTO users (email, name, password_hash, email_verified_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [email, 'Session Test User', await hashPassword(password)]
    );
    userId = rows[0].id;
  });

  after(async () => {
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await pool.end();
  });

  it('login creates a usable session cookie and authenticated middleware accepts it', async () => {
    const req = {
      body: { email, password },
      headers: { 'user-agent': 'node-test' },
      get: (name: string) => name.toLowerCase() === 'user-agent' ? 'node-test' : undefined,
      ip: '127.0.0.1',
    } as Partial<Request> as Request;
    const res = createResponse();
    const nextCall = await callNext();

    await login(req, res as Response, nextCall.next);

    assert.equal(nextCall.error, undefined);
    assert.equal(res.statusCodeValue, 200);
    assert.equal((res.jsonBody as { success: boolean }).success, true);

    const sessionCookie = res.cookies.get('elecshop_session');
    assert.ok(sessionCookie);
    assert.equal(sessionCookie.options.httpOnly, true);
    assert.equal(sessionCookie.options.signed, true);

    const storedSessions = await query<{ token: string; revoked_at: Date | null }>(
      'SELECT token, revoked_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    assert.equal(storedSessions.length, 1);
    assert.notEqual(storedSessions[0].token, sessionCookie.value);
    assert.equal(storedSessions[0].token, hashToken(sessionCookie.value));
    assert.equal(storedSessions[0].revoked_at, null);

    const authReq = {
      signedCookies: { elecshop_session: sessionCookie.value },
      originalUrl: '/api/v1/auth/sessions',
    } as Partial<Request> as Request;
    const authNext = await callNext();

    await requireAuth(authReq, {} as Response, authNext.next);

    assert.equal(authNext.error, undefined);
    assert.equal(authReq.user?.id, userId);
  });

  it('logout revokes the DB session, clears the cookie, and the old token fails middleware auth', async () => {
    const token = await createSession(userId, {
      userAgent: 'node-test',
      ipAddress: '127.0.0.1',
    });
    assert.equal((await validateSession(token))?.id, userId);

    const req = {
      signedCookies: { elecshop_session: token },
    } as Partial<Request> as Request;
    const res = createResponse();
    const nextCall = await callNext();

    await logout(req, res as Response, nextCall.next);

    assert.equal(nextCall.error, undefined);
    assert.equal((res.jsonBody as { success: boolean }).success, true);
    assert.ok(res.clearedCookies.has('elecshop_session'));

    const sessions = await query<{ revoked_at: Date | null }>(
      'SELECT revoked_at FROM sessions WHERE token = $1',
      [hashToken(token)]
    );
    assert.ok(sessions[0].revoked_at);
    assert.equal(await validateSession(token), null);

    const oldTokenReq = {
      signedCookies: { elecshop_session: token },
      originalUrl: '/api/v1/auth/sessions',
      headers: {},
      ip: '127.0.0.1',
      get: () => undefined,
    } as Partial<Request> as Request;
    const oldTokenNext = await callNext();

    await requireAuth(oldTokenReq, {} as Response, oldTokenNext.next);

    assert.ok(oldTokenNext.error);
    assert.ok(oldTokenNext.error instanceof Error);
    assert.match(oldTokenNext.error.message, /invalid|expired/i);
  });

  it('destroySession revokes an opaque token and validateSession rejects it', async () => {
    const token = await createSession(userId, {
      userAgent: 'node-test',
      ipAddress: '127.0.0.1',
    });

    const storedRows = await query<{ token: string; revoked_at: Date | null }>(
      'SELECT token, revoked_at FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    assert.equal(storedRows.length, 1);
    assert.notEqual(storedRows[0].token, token);
    assert.equal(storedRows[0].token, hashToken(token));
    assert.equal(storedRows[0].revoked_at, null);

    const validUser = await validateSession(token);
    assert.equal(validUser?.id, userId);

    await destroySession(token);

    const revokedRows = await query<{ revoked_at: Date | null }>(
      'SELECT revoked_at FROM sessions WHERE token = $1',
      [hashToken(token)]
    );
    assert.ok(revokedRows[0].revoked_at);

    const revokedUser = await validateSession(token);
    assert.equal(revokedUser, null);
  });

  it('destroyAllUserSessions revokes every active session for the user', async () => {
    const firstToken = await createSession(userId, { userAgent: 'node-test-1' });
    const secondToken = await createSession(userId, { userAgent: 'node-test-2' });

    assert.equal((await validateSession(firstToken))?.id, userId);
    assert.equal((await validateSession(secondToken))?.id, userId);

    await destroyAllUserSessions(userId);

    const activeRows = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM sessions WHERE user_id = $1 AND revoked_at IS NULL',
      [userId]
    );
    assert.equal(activeRows[0].count, '0');

    assert.equal(await validateSession(firstToken), null);
    assert.equal(await validateSession(secondToken), null);
  });
});
