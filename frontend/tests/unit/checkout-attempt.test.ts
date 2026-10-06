import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { prepareCheckoutAttempt, resetCheckoutAttempt, removePurchasedGuestItems, checkoutFollowUps,
  type CheckoutRequest } from '../../src/lib/checkout-attempt';

const request: CheckoutRequest = {
  guestEmail: 'synthetic@example.test', items: [{ productId: 'product-fixture', variantId: null, quantity: 1 }],
  shippingAddress: { fullName: 'Synthetic', phone: '0000000000', addressLine1: 'Synthetic address', city: 'Beirut', state: 'Beirut', country: 'Lebanon' },
  paymentMethod: 'cash_on_delivery', couponCode: 'TEST', deliverySlot: 'Morning',
};
function storage() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); }, data };
}

describe('checkout attempt identity and follow-up work', () => {
  it('reuses the same key for an exact retry and after remount, without storing personal fields', async () => {
    const saved = storage();
    const first = await prepareCheckoutAttempt('guest', request, null, saved as unknown as Storage);
    assert.deepEqual(await prepareCheckoutAttempt('guest', request, first, saved as unknown as Storage), first);
    assert.deepEqual(await prepareCheckoutAttempt('guest', request, null, saved as unknown as Storage), first);
    const serialized = [...saved.data.values()].join('');
    assert.doesNotMatch(serialized, /Synthetic|example|000000|Beirut|product-fixture/);
    assert.match(first.key, /^[A-Za-z0-9_-]{16,128}$/);
  });
  it('normalizes whitespace, coupon/email case, optional fields, item order and COD aliases', async () => {
    const first = await prepareCheckoutAttempt('guest', { ...request,
      items: [...request.items, { productId: 'other-fixture', quantity: 2 }] }, null, null);
    const reordered = { ...request, guestEmail: ' SYNTHETIC@EXAMPLE.TEST ', couponCode: ' test ', paymentMethod: 'cod',
      shippingAddress: { ...request.shippingAddress, fullName: ' Synthetic ', addressLine2: '' },
      items: [{ productId: 'other-fixture', variantId: null, quantity: 2 }, ...request.items] };
    assert.equal((await prepareCheckoutAttempt('guest', reordered, first, null)).key, first.key);
  });
  it('starts a fresh key when address, coupon, slot, identity, quantity, variant or cart row changes', async () => {
    const first = await prepareCheckoutAttempt('user:one', request, null, null);
    const changed = [
      { ...request, shippingAddress: { ...request.shippingAddress, phone: '1111111111' } },
      { ...request, couponCode: 'OTHER' }, { ...request, deliverySlot: 'Evening' },
      { ...request, items: [{ ...request.items[0], quantity: 2 }] },
      { ...request, items: [{ ...request.items[0], variantId: 'different' }] },
      { ...request, items: [{ ...request.items[0], cartItemId: 42 }] },
    ];
    for (const value of changed) assert.notEqual((await prepareCheckoutAttempt('user:one', value, first, null)).key, first.key);
    assert.notEqual((await prepareCheckoutAttempt('user:two', request, first, null)).key, first.key);
  });
  it('resets after acknowledged success/new purchase and tolerates broken storage', async () => {
    const saved = storage(); const store = saved as unknown as Storage;
    const first = await prepareCheckoutAttempt('guest', request, null, store);
    resetCheckoutAttempt(store);
    assert.notEqual((await prepareCheckoutAttempt('guest', request, null, store)).key, first.key);
    const broken = { getItem() { throw new Error('storage blocked'); }, setItem() { throw new Error('storage blocked'); },
      removeItem() { throw new Error('storage blocked'); } } as unknown as Storage;
    const attempt = await prepareCheckoutAttempt('guest', request, null, broken);
    assert.equal((await prepareCheckoutAttempt('guest', request, attempt, broken)).key, attempt.key);
    assert.doesNotThrow(() => resetCheckoutAttempt(broken));
  });
  it('subtracts only purchased guest quantities, preserving same-SKU additions and other products', () => {
    const current = [{ product_id: 'product-fixture', variant_id: null, quantity: 3, expires_at: 'synthetic' },
      { product_id: 'new-product', quantity: 2 }, { product_id: 'product-fixture', variant_id: 'other', quantity: 1 }];
    assert.deepEqual(removePurchasedGuestItems(current, request.items), [{ ...current[0], quantity: 2 }, current[1], current[2]]);
    assert.deepEqual(removePurchasedGuestItems([current[0]], [{ ...request.items[0], quantity: 3 }]), []);
  });
  it('isolates synchronous and asynchronous post-order failures from confirmation', async () => {
    const results = await checkoutFollowUps([async () => 'refreshed',
      () => { throw new Error('save address failed'); }, async () => { throw new Error('refresh failed'); }]);
    assert.deepEqual(results.map(result => result.status), ['fulfilled', 'rejected', 'rejected']);
  });
});
