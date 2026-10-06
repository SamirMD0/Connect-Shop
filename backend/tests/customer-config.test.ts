import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { customerConfigSchema, emailConfigSchema } from '../src/config/customerConfig';
describe('customer deployment configuration defaults', () => {
  it('preserves USD, 11% tax and existing pre-discount shipping rules', () => {
    const value = customerConfigSchema.parse({});
    assert.equal(value.STORE_CURRENCY, 'USD'); assert.equal(value.STORE_TAX_RATE, 0.11);
    assert.equal(value.STORE_SHIPPING_DEFAULT, 4); assert.equal(value.STORE_FREE_SHIPPING_THRESHOLD, 150);
    assert.equal(value.STORE_SHIPPING_BY_REGION.beirut, 3);
  });
  it('normalizes customer currency/regions and rejects unsupported precision or malformed financial rules', () => {
    const value = customerConfigSchema.parse({ STORE_CURRENCY: 'eur', STORE_SHIPPING_BY_REGION: '{" Alpha ":2.75}', STORE_TAX_RATE: '0.2' });
    assert.equal(value.STORE_CURRENCY, 'EUR'); assert.equal(value.STORE_TAX_RATE, 0.2); assert.equal(value.STORE_SHIPPING_BY_REGION.alpha, 2.75);
    for (const input of [{ STORE_CURRENCY: 'ZZZ' }, { STORE_CURRENCY: 'JPY' }, { STORE_TAX_RATE: '0.11junk' },
      { STORE_TAX_RATE: '-1' }, { STORE_TAX_RATE: '2' }, { STORE_SHIPPING_DEFAULT: '1.001' }, { STORE_LOCALE: 'invalid_locale' },
      { STORE_SHIPPING_BY_REGION: 'malformed' }, { STORE_SHIPPING_BY_REGION: '{"alpha":-1}' }, { STORE_SHIPPING_BY_REGION: '{"alpha":1.001}' },
      { STORE_NAME: 'Name\r\nInjected: header' }]) assert.equal(customerConfigSchema.safeParse(input).success, false);
  });
  it('requires explicit mock mode and forbids it in production even with all email features disabled', () => {
    assert.equal(emailConfigSchema.parse({ NODE_ENV: 'test' }).EMAIL_MODE, 'disabled');
    assert.equal(emailConfigSchema.parse({ NODE_ENV: 'development', EMAIL_MODE: 'mock' }).EMAIL_MODE, 'mock');
    assert.equal(emailConfigSchema.safeParse({ NODE_ENV: 'production', EMAIL_MODE: 'mock', EMAIL_AUTH_ENABLED: 'false', EMAIL_ORDER_CONFIRMATIONS_ENABLED: 'false' }).success, false);
  });
  it('requires configured verified production delivery when any email feature is enabled', () => {
    const valid = { NODE_ENV: 'production', EMAIL_MODE: 'resend', RESEND_API_KEY: 're_synthetic_test_only', EMAIL_FROM: 'store@sender.example.test', EMAIL_SENDER_VERIFIED: 'true' };
    assert.equal(emailConfigSchema.safeParse(valid).success, true);
    for (const change of [{ EMAIL_MODE: 'disabled' }, { RESEND_API_KEY: '' }, { RESEND_API_KEY: 'invalid' }, { EMAIL_FROM: 'invalid' }, { EMAIL_SENDER_VERIFIED: 'false' }]) assert.equal(emailConfigSchema.safeParse({ ...valid, ...change }).success, false);
    assert.equal(emailConfigSchema.safeParse({ NODE_ENV: 'production', EMAIL_AUTH_ENABLED: 'false', EMAIL_ORDER_CONFIRMATIONS_ENABLED: 'false' }).success, true);
  });
});
