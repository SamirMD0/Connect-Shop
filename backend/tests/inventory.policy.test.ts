import assert from 'node:assert/strict';
import { it } from 'node:test';
const id = require.resolve('../src/utils/errors');
class AppError extends Error { constructor(message: string, public statusCode: number, _op = true, public code?: string) { super(message); } }
require.cache[id] = { id, filename: id, loaded: true, exports: { AppError } } as NodeModule;
const { assertInventoryChange } = require('../src/services/inventoryVersion') as typeof import('../src/services/inventoryVersion');
const { allowedOrderTransitions, assertOrderTransition } = require('../src/services/orderTransitions') as typeof import('../src/services/orderTransitions');
it('stock changes require an exact inventory version and safe nonnegative integer', () => {
  assertInventoryChange(3, 2, 2);
  for (const [stock, version] of [[-1, 2], [1.5, 2], [2147483648, 2], [3, undefined], [3, 1], [3, '2']]) assert.throws(() => assertInventoryChange(stock, version, 2));
});
it('preserves forward fulfillment shortcuts and blocks reversals, resurrection and ambiguous cancellations', () => {
  const base = { status: 'confirmed', payment_status: 'pending', payment_method: 'cash_on_delivery' };
  assert.deepEqual(allowedOrderTransitions(base), ['processing', 'shipped', 'delivered', 'cancelled']);
  assertOrderTransition(base, 'shipped'); assertOrderTransition(base, 'delivered'); assertOrderTransition(base, 'cancelled');
  for (const status of ['shipped', 'delivered']) assert.throws(() => assertOrderTransition({ ...base, status }, 'cancelled'));
  assert.throws(() => assertOrderTransition({ ...base, payment_status: 'paid' }, 'cancelled'));
  assert.throws(() => assertOrderTransition({ ...base, status: 'processing' }, 'confirmed'));
  assert.throws(() => assertOrderTransition({ ...base, status: 'cancelled' }, 'confirmed'));
  assertOrderTransition({ ...base, status: 'cancelled' }, 'cancelled');
});
