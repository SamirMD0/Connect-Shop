import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

function stub(path: string, exports: unknown) {
  const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
class AppError extends Error { constructor(message: string, public statusCode: number) { super(message); } }
let replayed = false; let emailMode = ''; let emailCalls = 0; let lastOptions: any;
const warnings: unknown[][] = [];
const order = { id: 'synthetic-order', total: '14.10' };
stub('../src/services/orders.service', {
  placeOrder: async (_user: string, _shipping: unknown, _payment: unknown, options: unknown) => {
    lastOptions = options; return { order, replayed };
  },
  placeGuestOrder: async (_email: string, _items: unknown, _shipping: unknown, _payment: unknown, options: unknown) => {
    lastOptions = options; return { order, replayed };
  }, CheckoutAbuseError: class extends AppError {}, MAX_ACTIVE_COD_ORDERS: 2,
});
stub('../src/services/email.service', { EmailService: { sendOrderConfirmation: () => {
  emailCalls++;
  if (emailMode === 'sync') throw new Error('synthetic private email failure');
  if (emailMode === 'async') return Promise.reject(new Error('synthetic private email failure'));
  return Promise.resolve();
} } });
stub('../src/utils/errors', { AppError, NotFoundError: class extends AppError {} });
stub('../src/services/securityEvent.service', { logCheckoutBlocked() {}, maskPhone() {} });
stub('../src/utils/logger', { logger: { warn: (...args: unknown[]) => { warnings.push(args); } } });
const { create } = require('../src/controllers/orders.controller') as typeof import('../src/controllers/orders.controller');

async function submit(user?: { id: string; email: string }) {
  let status = 0; let body: any; const failures: unknown[] = [];
  await create({ user, body: { guestEmail: 'synthetic@example.test', shippingAddress: {}, items: [{ cartItemId: 7 }] },
    get: () => 'synthetic-key-0001' } as never,
  { status(code: number) { status = code; return this; }, json(value: unknown) { body = value; } } as never,
    (error: unknown) => { failures.push(error); });
  await new Promise(resolve => setImmediate(resolve));
  return { status, body, failures };
}

describe('committed checkout controller response', () => {
  beforeEach(() => { replayed = false; emailMode = ''; emailCalls = 0; warnings.length = 0; });
  it('passes the key and authenticated snapshot through while preserving the order API shape', async () => {
    const result = await submit({ id: 'synthetic-user', email: 'synthetic@example.test' });
    assert.equal(result.status, 201); assert.deepEqual(result.body.order, order);
    assert.equal(lastOptions.idempotencyKey, 'synthetic-key-0001');
    assert.deepEqual(lastOptions.items, [{ cartItemId: 7 }]); assert.deepEqual(result.failures, []);
  });
  it('does not send another confirmation email on a successful replay', async () => {
    await submit(); replayed = true; const repeated = await submit();
    assert.equal(repeated.status, 201); assert.equal(repeated.body.replayed, true); assert.equal(emailCalls, 1);
  });
  it('keeps synchronous and asynchronous email failures out of checkout errors and logs no private details', async () => {
    for (const failure of ['sync', 'async']) {
      emailMode = failure; const result = await submit();
      assert.equal(result.status, 201); assert.deepEqual(result.failures, []); assert.equal(result.body.order.id, order.id);
    }
    assert.equal(warnings.length, 2); assert.doesNotMatch(JSON.stringify(warnings), /private email|example.test/);
  });
});
