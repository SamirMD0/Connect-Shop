/* eslint-disable @typescript-eslint/no-require-imports -- Node tests reload configuration modules after changing synthetic environment values. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatStoreMoney } from '../../src/lib/store-settings';
import { expectedQuote } from '../../src/lib/checkout-quote';
import { normalizedCheckoutAttempt, type CheckoutRequest } from '../../src/lib/checkout-attempt';

describe('customer currency and quote display contract', () => {
  it('formats configured currency while preserving two decimal/compact conventions and unavailable values', () => {
    assert.equal(formatStoreMoney('12.34', 'EUR'), '€12.34'); assert.equal(formatStoreMoney(12, 'USD', 'en-US', true), '$12');
    assert.equal(formatStoreMoney('12', 'USD'), '$12.00'); assert.equal(formatStoreMoney('12', null), '12.00');
    assert.equal(formatStoreMoney('invalid', 'USD'), 'Unavailable'); assert.equal(formatStoreMoney(null, 'USD'), 'Unavailable');
  });
  it('extracts only monetary quote preconditions and retains the checkout key identity when a quote is refreshed', () => {
    const quote = { subtotal: '10.00', discount_amount: '1.00', tax_amount: '0.99', shipping_cost: '3.00', total: '12.99', currency: 'USD',
      tax_rate: 0.11, coupon_code: 'TEST', items: [{ productId: 'synthetic', variantId: null, quantity: 1, price: '10.00' }] };
    assert.deepEqual(Object.keys(expectedQuote(quote)), ['subtotal', 'discount_amount', 'tax_amount', 'shipping_cost', 'total', 'currency']);
    const request: CheckoutRequest = { items: [{ productId: 'synthetic', quantity: 1 }], shippingAddress: { fullName: 'Synthetic', phone: '00000000', addressLine1: 'Synthetic', city: 'Synthetic', state: 'Synthetic', country: 'Synthetic' }, paymentMethod: 'cash_on_delivery' };
    assert.equal(normalizedCheckoutAttempt('guest', { ...request, expectedQuote: expectedQuote(quote) }),
      normalizedCheckoutAttempt('guest', { ...request, expectedQuote: expectedQuote({ ...quote, total: '20.00' }) }));
    assert.notEqual(normalizedCheckoutAttempt('guest', request), normalizedCheckoutAttempt('guest', { ...request, couponCode: 'NEW' }));
  });
  it('retains existing branding/contact defaults and validates custom semantic colors', () => {
    const names = ['NEXT_PUBLIC_APP_NAME', 'NEXT_PUBLIC_BUSINESS_PHONE', 'NEXT_PUBLIC_BUSINESS_WHATSAPP', 'NEXT_PUBLIC_BUSINESS_EMAIL',
      'NEXT_PUBLIC_BUSINESS_ADDRESS', 'NEXT_PUBLIC_BUSINESS_HOURS', 'NEXT_PUBLIC_META_TITLE', 'NEXT_PUBLIC_META_DESCRIPTION', 'NEXT_PUBLIC_META_KEYWORDS',
      'NEXT_PUBLIC_COLOR_ACCENT', 'NEXT_PUBLIC_COLOR_ACCENT_HOVER', 'NEXT_PUBLIC_COLOR_ACCENT_GLOW', 'NEXT_PUBLIC_COLOR_BACKGROUND', 'NEXT_PUBLIC_COLOR_SURFACE',
      'NEXT_PUBLIC_COLOR_ELEVATED', 'NEXT_PUBLIC_COLOR_TEXT', 'NEXT_PUBLIC_COLOR_MUTED', 'NEXT_PUBLIC_COLOR_BORDER'];
    const old = names.map(name => process.env[name]);
    const configId = require.resolve('../../src/lib/business-config'); const constantsId = require.resolve('../../src/lib/constants');
    try {
      names.forEach(name => delete process.env[name]); delete require.cache[configId]; delete require.cache[constantsId];
      let config = require('../../src/lib/business-config') as typeof import('../../src/lib/business-config');
      assert.equal(config.businessContact.name, 'ELECTRO SHOP'); assert.equal(config.businessBrand.colors['--color-accent'], '#2563eb');
      process.env.NEXT_PUBLIC_APP_NAME = 'Synthetic Customer'; process.env.NEXT_PUBLIC_META_TITLE = 'Synthetic Metadata';
      process.env.NEXT_PUBLIC_COLOR_ACCENT = '#123456'; process.env.NEXT_PUBLIC_COLOR_BACKGROUND = 'url(unsafe)';
      delete require.cache[configId]; delete require.cache[constantsId]; config = require('../../src/lib/business-config');
      assert.equal(config.businessContact.name, 'Synthetic Customer'); assert.equal(config.businessBrand.title, 'Synthetic Metadata');
      assert.equal(config.businessBrand.colors['--color-accent'], '#123456'); assert.equal(config.businessBrand.colors['--color-bg-primary'], '#f8fafc');
    } finally { names.forEach((name, i) => { if (old[i] === undefined) delete process.env[name]; else process.env[name] = old[i]; }); delete require.cache[configId]; delete require.cache[constantsId]; }
  });
});
