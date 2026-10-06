import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
const stub = (path: string, exports: unknown) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule; };
class AppError extends Error { constructor(message: string, public statusCode: number, _op = true, public code?: string) { super(message); } }
stub('../src/utils/errors', { AppError, NotFoundError: class extends AppError {} });
stub('../src/config/db', { query() { throw new Error('No database in policy tests'); }, withTransaction() { throw new Error('No database in policy tests'); } });
const { normalizeMergeItems } = require('../src/services/cartMerge.service') as typeof import('../src/services/cartMerge.service');
const { checkoutIdentity } = require('../src/services/checkoutIdempotency') as typeof import('../src/services/checkoutIdempotency');
const productId = 'abcdef12-1111-4111-8111-111111111111';
describe('cart merge input policy (offline)', () => {
  it('canonicalizes duplicate SKUs, case and expiry without trusting extra fields', () => {
    assert.deepEqual(normalizeMergeItems([{ productId: productId.toUpperCase(), quantity: 2, price: 0, expiresAt: '2099-01-02T00:00:00Z' },
      { productId, variantId: null, quantity: 3, expiresAt: '2099-01-01T00:00:00.000Z' }]),
      [{ productId, variantId: null, quantity: 5, expiresAt: '2099-01-01T00:00:00.000Z' }]);
  });
  it('keeps excess duplicate quantity for explicit line rejection instead of truncating it', () => {
    assert.equal(normalizeMergeItems([{ productId, quantity: 99 }, { productId, quantity: 1 }])[0].quantity, 100);
  });
  it('rejects malformed input, nonnumeric quantities, invalid expiry and oversized requests', () => {
    for (const value of [null, [], [{ productId: 'bad', quantity: 1 }], [{ productId, quantity: '1' }],
      [{ productId, quantity: 0 }], [{ productId, quantity: 1.5 }], [{ productId, quantity: 1, variantId: '' }],
      [{ productId, quantity: 1, expiresAt: 'bad' }], Array.from({ length: 51 }, () => ({ productId, quantity: 1 }))]) assert.throws(() => normalizeMergeItems(value));
  });
  it('uses checkout key validation/hashing with a separate merge scope', () => {
    assert.throws(() => checkoutIdentity('cart-merge:user:one', undefined, [], 'cart merge'), (error: any) => error.code === 'IDEMPOTENCY_KEY_REQUIRED');
    const a = checkoutIdentity('cart-merge:user:one', 'synthetic-key-0001', []);
    assert.notEqual(a.scopeHash, checkoutIdentity('user:one', 'synthetic-key-0001', []).scopeHash);
    assert.notEqual(a.requestHash, checkoutIdentity('cart-merge:user:one', 'synthetic-key-0001', [1]).requestHash);
  });
});

// Controller-only checks keep all post-commit work outside the success path.
describe('cart merge controller confirmation (offline)', () => {
  let calls = 0; let maintenance = '';
  const warnings: unknown[] = [];
  stub('../src/services/cartMerge.service', { mergeCart: async (_user: string, key: string, items: unknown) => {
    calls++; assert.equal(key, 'synthetic-key-0001'); assert.deepEqual(items, [{ productId, quantity: 1 }]);
    return { accepted: [{ productId, variantId: null, quantity: 1, cartItemId: 1 }], rejected: [], cart: { items: [], itemCount: 1, total: '10.00' }, replayed: true };
  } });
  stub('../src/services/cart.service', { queueAbandonedCartRecovery: () => {
    if (maintenance === 'sync') throw new Error('synthetic private detail');
    if (maintenance === 'async') return Promise.reject(new Error('synthetic private detail'));
    return Promise.resolve();
  } });
  stub('../src/utils/logger', { logger: { warn: (message: unknown) => warnings.push(message) } });
  const { merge } = require('../src/controllers/cart.controller') as typeof import('../src/controllers/cart.controller');
  const request = (expected = productId) => ({ body: { userId: expected, items: [{ productId, quantity: 1 }] }, user: { id: productId }, get: () => 'synthetic-key-0001' });
  it('forwards the stable key and preserves explicit replay/results', async () => {
    let result: any; let error: unknown;
    await merge(request() as any, { json: (value: unknown) => { result = value; } } as any, value => { error = value; });
    assert.equal(error, undefined); assert.equal(result.success, true); assert.equal(result.replayed, true); assert.equal(result.accepted.length, 1);
  });
  it('blocks an account change before any merge operation', async () => {
    const before = calls; let error: any;
    await merge(request('another-account') as any, { json: () => assert.fail('Must not respond with success') } as any, value => { error = value; });
    assert.equal(calls, before); assert.equal(error.code, 'MERGE_USER_CHANGED');
  });
  it('keeps synchronous and asynchronous recovery failures out of committed success', async () => {
    for (const mode of ['sync', 'async']) {
      maintenance = mode; let successes = 0; let error: unknown;
      await merge(request() as any, { json: () => { successes++; } } as any, value => { error = value; });
      await new Promise<void>(resolve => setImmediate(resolve));
      assert.equal(successes, 1); assert.equal(error, undefined);
    }
    assert.equal(warnings.length, 2); assert.doesNotMatch(JSON.stringify(warnings), /synthetic private detail/);
  });
});
