import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

function stub(path: string, exports: unknown) {
  const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
class AppError extends Error {
  constructor(message: string, public statusCode: number, _operational = true, public code?: string) { super(message); }
}
stub('../src/utils/errors', { AppError });
const warnings: unknown[][] = [];
stub('../src/utils/logger', { logger: { warn: (...args: unknown[]) => { warnings.push(args); } } });
stub('../src/config/env', { env: { REDIS_CACHE_TIMEOUT_MS: 15 } });
let cacheFailure = ''; let cacheCalls = 0;
stub('../src/services/products.service', { invalidateProductCaches: async (slugs: string[]) => {
  cacheCalls++; assert.deepEqual(slugs, ['synthetic-product']);
  if (cacheFailure === 'throw') throw new Error('synthetic private cache error');
  if (cacheFailure === 'hang') return new Promise<never>(() => {});
} });
let calls: string[]; let insertedOrders: number; let committed: number; let rolledBack: number;
let failBeforeCommit: boolean; let saved: { request_hash: string; response: unknown; cache_slugs: string[] } | null;
const productId = 'abcdef12-1111-4111-8111-111111111111';
const shippingAddress = { fullName: 'Synthetic', phone: '0000000000', addressLine1: 'Synthetic', city: 'Beirut', country: 'Lebanon' };
const items = [{ productId, variantId: null, quantity: 1 }];
const client = { query: async (sql: string, values: any[] = []) => {
  calls.push(sql);
  if (sql.startsWith('INSERT INTO checkout_requests')) {
    if (saved) return { rows: [], rowCount: 0 };
    saved = { request_hash: values[2], response: null, cache_slugs: [] }; return { rows: [{}], rowCount: 1 };
  }
  if (sql.startsWith('SELECT request_hash')) return { rows: saved ? [saved] : [], rowCount: saved ? 1 : 0 };
  if (sql.includes('FROM cart_items ci')) return { rows: [{ id: 7, product_id: productId, variant_id: null, quantity: 1 }], rowCount: 1 };
  if (sql.includes('FROM products p')) return { rows: [{ product_id: productId, variant_id: null, quantity: 1,
    name: 'Synthetic', slug: 'synthetic-product', price: '10.00', stock: 10, variant_name: null }], rowCount: 1 };
  if (sql.includes('COUNT(*) AS count')) return { rows: [{ count: '0' }], rowCount: 1 };
  if (sql.includes('INSERT INTO orders')) {
    insertedOrders++; return { rows: [{ id: 'synthetic-order', total: '14.10', shipping_address: shippingAddress }], rowCount: 1 };
  }
  if (sql.startsWith('UPDATE checkout_requests')) {
    if (failBeforeCommit) throw new Error('synthetic pre-commit failure');
    saved!.response = JSON.parse(values[3]); saved!.cache_slugs = values[4]; return { rows: [], rowCount: 1 };
  }
  return { rows: [], rowCount: 1 };
} };
stub('../src/config/db', {
  query: () => { throw new Error('Out-of-transaction lookup forbidden in checkout tests'); },
  withTransaction: async (work: (value: typeof client) => Promise<unknown>) => {
    const snapshot = structuredClone(saved); const oldOrders = insertedOrders;
    try { const result = await work(client); committed++; return result; }
    catch (error) { saved = snapshot; insertedOrders = oldOrders; rolledBack++; throw error; }
  },
});
// The real cart module is safe to import because its DB dependency is already stubbed.
const { placeOrder, placeGuestOrder } = require('../src/services/orders.service') as typeof import('../src/services/orders.service');
const { normalizeCheckoutItems, checkoutIdentity } = require('../src/services/checkoutIdempotency') as typeof import('../src/services/checkoutIdempotency');

// These mocks check application control flow, NOT PostgreSQL uniqueness/concurrency.
describe('checkout control flow (offline)', () => {
  beforeEach(() => {
    calls = []; insertedOrders = 0; committed = 0; rolledBack = 0; saved = null;
    failBeforeCommit = false; cacheFailure = ''; cacheCalls = 0; warnings.length = 0;
  });
  it('requires a valid key and scopes hashes to the actor without retaining personal text', () => {
    assert.throws(() => checkoutIdentity('guest:synthetic@example.test', undefined, {}), (error: any) => error.code === 'IDEMPOTENCY_KEY_REQUIRED');
    const one = checkoutIdentity('user:one', 'synthetic-key-0001', { field: 'synthetic-private' });
    const two = checkoutIdentity('user:two', 'synthetic-key-0001', { field: 'synthetic-private' });
    assert.notEqual(one.scopeHash, two.scopeHash); assert.equal(one.keyHash, two.keyHash);
    assert.doesNotMatch(JSON.stringify(one), /synthetic/);
  });
  it('canonicalizes guest item order/case/duplicates and rejects excess quantities or invalid auth row IDs', () => {
    assert.deepEqual(normalizeCheckoutItems([{ ...items[0], productId: productId.toUpperCase(), quantity: 2 }, items[0]], false),
      [{ ...items[0], quantity: 3 }]);
    assert.throws(() => normalizeCheckoutItems([{ ...items[0], quantity: 99 }, items[0]], false));
    assert.throws(() => normalizeCheckoutItems(items, true));
    assert.throws(() => normalizeCheckoutItems([{ ...items[0], cartItemId: 7 }, { ...items[0], cartItemId: 7 }], true));
  });
  it('replays the committed guest order before stock, coupon or cart work', async () => {
    const first = await placeGuestOrder('synthetic@example.test', items, shippingAddress, 'cod', { idempotencyKey: 'synthetic-key-0001' });
    const before = calls.length;
    const second = await placeGuestOrder(' SYNTHETIC@EXAMPLE.TEST ', items, { ...shippingAddress, fullName: ' Synthetic ' }, 'cash_on_delivery', { idempotencyKey: 'synthetic-key-0001' });
    assert.equal(second.order.id, first.order.id); assert.equal(second.replayed, true); assert.equal(insertedOrders, 1);
    assert.equal(calls.slice(before).some(sql => sql.includes('FROM products p') || sql.includes('INSERT INTO orders')), false);
    assert.equal(cacheCalls, 2);
  });
  it('rejects conflicting reuse without creating an order or changing the committed result', async () => {
    await placeGuestOrder('synthetic@example.test', items, shippingAddress, 'cod', { idempotencyKey: 'synthetic-key-0001' });
    await assert.rejects(placeGuestOrder('synthetic@example.test', [{ ...items[0], quantity: 2 }], shippingAddress, 'cod', { idempotencyKey: 'synthetic-key-0001' }),
      (error: any) => error.statusCode === 409 && error.code === 'IDEMPOTENCY_CONFLICT');
    assert.equal(insertedOrders, 1); assert.equal(rolledBack, 1);
  });
  it('does not return success before finalizing the claim; a failure can retry with the same key', async () => {
    failBeforeCommit = true;
    await assert.rejects(placeGuestOrder('synthetic@example.test', items, shippingAddress, 'cod', { idempotencyKey: 'synthetic-key-0001' }));
    assert.equal(committed, 0); assert.equal(cacheCalls, 0);
    failBeforeCommit = false;
    const result = await placeGuestOrder('synthetic@example.test', items, shippingAddress, 'cod', { idempotencyKey: 'synthetic-key-0001' });
    assert.equal(result.replayed, false); assert.equal(committed, 1);
  });
  it('still returns the committed order when cache maintenance rejects or hangs', async () => {
    for (const failure of ['throw', 'hang']) {
      cacheFailure = failure;
      const result = await placeGuestOrder('synthetic@example.test', items, shippingAddress, 'cod', { idempotencyKey: 'synthetic-key-0001' });
      assert.equal(result.order.id, 'synthetic-order');
    }
    assert.equal(insertedOrders, 1); assert.equal(committed, 2);
    assert.doesNotMatch(JSON.stringify(warnings), /private cache error|0000000000/);
  });
  it('locks the user cart before reading it and consumes only the snapshot IDs', async () => {
    await placeOrder('synthetic-user', shippingAddress, 'cod', { items: [{ ...items[0], cartItemId: 7 }], idempotencyKey: 'synthetic-key-0001' });
    const lock = calls.findIndex(sql => sql.includes('hashtextextended'));
    const read = calls.findIndex(sql => sql.includes('FROM cart_items ci'));
    assert.ok(lock >= 0 && lock < read); assert.match(calls[read], /FOR UPDATE/);
    assert.ok(calls.some(sql => sql.includes('DELETE FROM cart_items') && sql.includes('id = ANY')));
    assert.equal(calls.some(sql => sql === 'DELETE FROM cart_items WHERE user_id = $1'), false);
  });
  it('rejects a changed authenticated cart snapshot before price/stock mutations', async () => {
    await assert.rejects(placeOrder('synthetic-user', shippingAddress, 'cod', { items: [{ ...items[0], cartItemId: 8 }], idempotencyKey: 'synthetic-key-0001' }),
      (error: any) => error.code === 'CART_CHANGED');
    assert.equal(insertedOrders, 0); assert.equal(committed, 0);
  });
});
