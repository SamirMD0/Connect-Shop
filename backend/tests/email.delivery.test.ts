import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
const stub = (path: string, exports: unknown) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule; };
const settings = { NODE_ENV: 'test', EMAIL_MODE: 'resend', RESEND_API_KEY: 're_synthetic_test_only', EMAIL_FROM: 'store@sender.example.test',
  EMAIL_REPLY_TO: 'help@sender.example.test', EMAIL_SENDER_VERIFIED: true, EMAIL_AUTH_ENABLED: true, EMAIL_ORDER_CONFIRMATIONS_ENABLED: true, EMAIL_TIMEOUT_MS: 20,
  STORE_NAME: 'Synthetic & Customer', STORE_CURRENCY: 'EUR' };
stub('../src/config/env', { env: settings });
const logs: unknown[][] = [];
stub('../src/utils/logger', { logger: { info: (...args: unknown[]) => logs.push(args), error: (...args: unknown[]) => logs.push(args) } });
let responses: any[] = []; const calls: { payload: any; options: any }[] = [];
stub('resend', { Resend: class { emails = { send: async (payload: any, options: any) => {
  calls.push({ payload, options }); const result = responses.shift();
  if (result === 'throw') throw new Error('synthetic-recipient@example.test token=private-token raw-provider-body');
  if (result === 'hang') return new Promise<never>(() => {});
  return result || { data: { id: 'synthetic-provider-id' }, error: null };
} }; } });
const { EmailService, EmailDeliveryError } = require('../src/services/email.service') as typeof import('../src/services/email.service');
const recipient = 'synthetic-recipient@example.test'; const resetUrl = 'https://store.example.test/auth/reset-password?token=private-token&field="unsafe"';
describe('email delivery with fake provider only', () => {
  beforeEach(() => { calls.length = 0; logs.length = 0; responses = []; Object.assign(settings, { NODE_ENV: 'test', EMAIL_MODE: 'resend', EMAIL_AUTH_ENABLED: true, EMAIL_ORDER_CONFIRMATIONS_ENABLED: true, EMAIL_FROM: 'store@sender.example.test' }); });
  it('uses customer sender/reply-to and reports provider acceptance without logging content or recipient', async () => {
    assert.equal(await EmailService.sendPasswordReset(recipient, resetUrl), 'accepted');
    assert.equal(calls[0].payload.from, '"Synthetic & Customer" <store@sender.example.test>');
    assert.equal(calls[0].payload.replyTo, 'help@sender.example.test'); assert.match(calls[0].payload.html, /&amp;field=&quot;unsafe&quot;/);
    assert.doesNotMatch(JSON.stringify(logs), /private-token|synthetic-recipient|provider-id|raw-provider-body|reset-password/);
  });
  it('checks returned provider errors and does not retry invalid sender/auth/quota errors', async () => {
    responses = [{ data: null, error: { name: 'validation_error', message: 'private-token raw-provider-body' } }];
    await assert.rejects(EmailService.sendPasswordReset(recipient, resetUrl), (error: unknown) => error instanceof EmailDeliveryError && error.category === 'provider_rejected');
    assert.equal(calls.length, 1); assert.doesNotMatch(JSON.stringify(logs), /private-token|raw-provider-body|synthetic-recipient/);
  });
  it('retries a transient returned failure using the identical payload and opaque key', async () => {
    responses = [{ data: null, error: { name: 'application_error', message: 'private detail' } }];
    assert.equal(await EmailService.sendPasswordReset(recipient, resetUrl), 'accepted'); assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], calls[1]); assert.match(calls[0].options.idempotencyKey, /^[0-9a-f]{64}$/);
  });
  it('bounds thrown failures and never replaces them with apparent success', async () => {
    responses = ['throw', 'throw', 'throw'];
    await assert.rejects(EmailService.sendPasswordReset(recipient, resetUrl), EmailDeliveryError); assert.equal(calls.length, 3);
    assert.doesNotMatch(JSON.stringify(logs), /private-token|raw-provider-body|synthetic-recipient/);
  });
  it('bounds an unresolved provider and reports timeout internally', async () => {
    responses = ['hang', 'hang', 'hang'];
    await assert.rejects(EmailService.sendPasswordReset(recipient, resetUrl), (error: unknown) => error instanceof EmailDeliveryError && error.category === 'timeout');
    assert.equal(calls.length, 3);
  });
  it('distinguishes explicit mock/disabled modes and never permits production mock delivery', async () => {
    settings.EMAIL_MODE = 'mock'; assert.equal(await EmailService.sendPasswordReset(recipient, resetUrl), 'mock'); assert.equal(calls.length, 0);
    assert.doesNotMatch(JSON.stringify(logs), /private-token|synthetic-recipient/);
    settings.NODE_ENV = 'production'; await assert.rejects(EmailService.sendPasswordReset(recipient, resetUrl), EmailDeliveryError); assert.equal(calls.length, 0);
    settings.EMAIL_MODE = 'disabled'; settings.EMAIL_AUTH_ENABLED = false;
    assert.equal(await EmailService.sendPasswordReset(recipient, resetUrl), 'disabled'); assert.equal(calls.length, 0);
  });
  it('formats COD confirmation with the order currency and configured brand', async () => {
    await EmailService.sendOrderConfirmation(recipient, 'synthetic-order', 12.34, 'EUR');
    assert.match(calls[0].payload.html, /€12.34/); assert.match(calls[0].payload.html, /Synthetic &amp; Customer/);
    assert.doesNotMatch(calls[0].payload.html, /elecshop\.com/); assert.match(calls[0].payload.html, /No online payment was collected/);
  });
});
