import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
const stub = (path: string, exports: unknown) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule; };
class AppError extends Error { constructor(message: string, public statusCode = 400) { super(message); } }
stub('../src/config/env', { env: { NODE_ENV: 'test' } });
stub('../src/utils/errors', { AppError });
stub('../src/utils/crypto', {}); stub('../src/middleware/csrf', {}); stub('../src/services/mfa.service', {});
stub('../src/services/progressiveProtection.service', {}); stub('../src/services/securityEvent.service', {});
let responseMode = ''; const warnings: string[] = [];
stub('../src/utils/logger', { logger: { warn: (message: string) => warnings.push(message) } });
stub('../src/services/auth.service', { requestPasswordReset: () => {
  if (responseMode === 'fail') throw new Error('synthetic@example.test private-token raw provider detail');
  if (responseMode === 'pending') return new Promise<never>(() => {});
  return Promise.resolve();
} });
const { forgotPassword } = require('../src/controllers/auth.controller') as typeof import('../src/controllers/auth.controller');
describe('password recovery response privacy', () => {
  it('returns identical generic confirmation for absent accounts, provider failure and unresolved delivery', async () => {
    const results: unknown[] = [];
    for (const mode of ['absent', 'fail', 'pending']) {
      responseMode = mode; const failures: unknown[] = [];
      await forgotPassword({ body: { email: 'synthetic@example.test' } } as any,
        { json: (value: unknown) => results.push(value) } as any, error => failures.push(error));
      await new Promise<void>(resolve => setImmediate(resolve)); assert.deepEqual(failures, []);
    }
    assert.equal(results.length, 3); assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
    assert.doesNotMatch(JSON.stringify(warnings), /example.test|private-token|raw provider/);
  });
});
