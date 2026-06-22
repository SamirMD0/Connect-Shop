import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getCrossSiteCookieSecurityOptions } from '../src/config/cookies';

const backendRoot = path.resolve(__dirname, '..');

describe('production cookie and request-log security', () => {
  it('uses cross-site secure cookies in production and lax cookies locally', () => {
    assert.deepEqual(getCrossSiteCookieSecurityOptions('production'), {
      secure: true,
      sameSite: 'none',
    });
    assert.deepEqual(getCrossSiteCookieSecurityOptions('development'), {
      secure: false,
      sameSite: 'lax',
    });
  });

  it('uses the shared cookie policy for auth sessions, CSRF, and account deletion', () => {
    const files = [
      'src/controllers/auth.controller.ts',
      'src/controllers/users.controller.ts',
      'src/middleware/csrf.ts',
    ];

    for (const file of files) {
      const source = readFileSync(path.join(backendRoot, file), 'utf8');
      assert.match(source, /getCrossSiteCookieSecurityOptions/);
    }
  });

  it('redacts session, CSRF, authorization, and SSR secrets from request logs', () => {
    const source = readFileSync(path.join(backendRoot, 'src/utils/logger.ts'), 'utf8');

    assert.match(source, /req\.headers\.cookie/);
    assert.match(source, /req\.headers\.authorization/);
    assert.match(source, /x-connect-shop-ssr-secret/);
    assert.match(source, /x-csrf-token/);
    assert.match(source, /set-cookie/);
  });
});
