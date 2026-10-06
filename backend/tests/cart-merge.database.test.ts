import assert from 'node:assert/strict';
import { before, after, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { Pool } from 'pg';
import type { Browser, BrowserContext, Page } from '../../frontend/node_modules/@playwright/test';
import type { MergeLine } from '../src/services/cartMerge.service';

// Never load dotenv or fall back to DATABASE_URL. Requires a newly created,
// empty, synthetic database whose ownership was independently verified.
const databaseUrl = process.env.PHASE5_DISPOSABLE_DATABASE_URL;
const enabled = Boolean(databaseUrl) && process.env.PHASE5_DISPOSABLE_DATABASE_VERIFIED === 'yes';
const skip = enabled ? false : 'Integration acceptance blocked: verified disposable PostgreSQL was not supplied';
function stub(path: string, exports: unknown) { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule; }
let db: typeof import('../src/config/db'); let setupPool: Pool;
let read: typeof import('../src/config/db').query;
let cart: typeof import('../src/services/cart.service');
let merge: typeof import('../src/services/cartMerge.service').mergeCart;
let controller: typeof import('../src/controllers/cart.controller');
let orders: typeof import('../src/services/orders.service');
const schema = 'phase5_acceptance_' + randomUUID().replace(/-/g, '');
let userId: string; let productId: string; let otherProductId: string;
let browser: Browser; let server: Server; let origin: string; let dropResponse = false;
const key = () => randomUUID();
const input = (quantity = 2): MergeLine[] => [{ productId, variantId: null, quantity }];
const quantity = async (actor = userId, product = productId) => (await cart.getCart(actor)).items.find(row => row.product_id === product)?.quantity || 0;
const receiptCount = async () => Number((await read<{ count: string }>('SELECT COUNT(*) AS count FROM cart_merge_requests'))[0].count);
const syntheticAddress = { fullName: 'Synthetic', phone: '0000000000', addressLine1: 'Synthetic', city: 'Beirut', country: 'Lebanon' };

// Only external cache/logging are replaced. All claims, receipts, cart writes,
// uniqueness, advisory locks, stock checks and checkout transactions use PostgreSQL.
describe('atomic cart merge PostgreSQL and native-browser acceptance', { skip, concurrency: false }, () => {
  before(async () => {
    const target = new URL(databaseUrl!);
    assert.ok(['postgres:', 'postgresql:'].includes(target.protocol));
    assert.ok(['127.0.0.1', '[::1]'].includes(target.hostname));
    assert.equal(target.pathname, '/connect_shop_phase5_disposable'); assert.equal(target.search, '');
    stub('../src/config/env', { env: { DATABASE_URL: databaseUrl, DB_STATEMENT_TIMEOUT_MS: 10000, REDIS_CACHE_TIMEOUT_MS: 30 } });
    stub('../src/utils/logger', { logger: { info() {}, warn() {}, error() {} } });
    stub('../src/utils/performance', { logSlowQuery() {} });
    db = require('../src/config/db');
    setupPool = new (require('pg').Pool)(db.buildPoolConfig(databaseUrl!, { statementTimeoutMs: 0 }));
    const client = await setupPool.connect();
    try {
      assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'connect_shop_phase5_disposable');
      assert.equal((await client.query('SHOW transaction_isolation')).rows[0].transaction_isolation, 'read committed');
      const existing = await client.query("SELECT COUNT(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'");
      assert.equal(existing.rows[0].count, 0, 'Disposable database must start empty; customer tables are prohibited');
      assert.match(schema, /^phase5_acceptance_[0-9a-f]{32}$/);
      await client.query('CREATE SCHEMA "' + schema + '"'); await client.query('SET search_path TO "' + schema + '", public');
      const fresh = readFileSync(require.resolve('../src/db/schema.sql'), 'utf8');
      await client.query(fresh);
      assert.ok((await client.query("SELECT to_regclass('cart_merge_requests') AS name")).rows[0].name);
      await client.query('DROP TABLE cart_merge_requests'); // Actual upgrade from Phase 4.
      const migration = readFileSync(require.resolve('../src/db/migrations/015_cart_merge_idempotency.sql'), 'utf8');
      await client.query(migration); await client.query(migration); // Safe reapplication.
    } finally { client.release(); }
    const transaction: typeof db.withTransaction = work => db.withTransaction(async client => {
      await client.query('SET LOCAL search_path TO "' + schema + '", public'); return work(client);
    });
    read = (sql, values) => transaction(async client => (await client.query(sql, values)).rows);
    stub('../src/config/db', { ...db, query: read, withTransaction: transaction });
    class AppError extends Error { constructor(message: string, public statusCode: number, _op = true, public code?: string) { super(message); } }
    stub('../src/utils/errors', { AppError, NotFoundError: class extends AppError { constructor() { super('Not found', 404); } } });
    stub('../src/services/products.service', { invalidateProductCaches: async () => {} });
    cart = require('../src/services/cart.service'); merge = require('../src/services/cartMerge.service').mergeCart;
    controller = require('../src/controllers/cart.controller'); orders = require('../src/services/orders.service');
    const { build } = require('esbuild');
    const bundle = (await build({ entryPoints: [require.resolve('../../frontend/src/lib/guest-cart.ts')], bundle: true, write: false,
      platform: 'browser', format: 'iife', globalName: 'GuestCart', define: { 'process.env': '{}' } })).outputFiles[0].text;
    server = createServer(async (req, res) => {
      if (req.method === 'GET') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Synthetic cart acceptance</title><script>' + bundle + '</script>'); return; }
      try {
        let raw = ''; for await (const chunk of req) raw += chunk;
        const body = JSON.parse(raw);
        // Synthetic fixed authenticated identity. Actual controller checks the
        // expected account. This fixture does not bypass production auth/CSRF.
        let result: unknown; let failure: any;
        await controller.merge({ body, user: { id: userId }, get: () => req.headers['idempotency-key'] } as any,
          { json: (value: unknown) => { result = value; } } as any, error => { failure = error; });
        if (failure) { res.statusCode = failure.statusCode || 500; result = { message: failure.message, code: failure.code }; }
        if (dropResponse && !failure) { res.destroy(); return; }
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result));
      } catch { res.statusCode = 500; res.end('{}'); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string'); origin = 'http://127.0.0.1:' + address.port;
    browser = await require('../../frontend/node_modules/@playwright/test').chromium.launch({ headless: true });
  });
  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (!db) return;
    try { assert.match(schema, /^phase5_acceptance_[0-9a-f]{32}$/); if (setupPool) await setupPool.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE'); }
    finally { if (setupPool) await setupPool.end(); await db.pool.end(); }
  });
  beforeEach(async () => {
    dropResponse = false;
    const client = await setupPool.connect();
    try { await client.query('SET search_path TO "' + schema + '", public');
      await client.query('DELETE FROM cart_merge_requests; DELETE FROM checkout_requests; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM products; DELETE FROM users; DELETE FROM categories');
    } finally { client.release(); }
    userId = (await read<{ id: string }>("INSERT INTO users (name,email) VALUES ('Synthetic','synthetic@example.test') RETURNING id"))[0].id;
    const category = (await read<{ id: number }>("INSERT INTO categories (name,slug) VALUES ('Synthetic','synthetic') RETURNING id"))[0].id;
    productId = (await read<{ id: string }>("INSERT INTO products (name,slug,price,category_id,stock) VALUES ('Synthetic','synthetic',10,$1,10) RETURNING id", [category]))[0].id;
    otherProductId = (await read<{ id: string }>("INSERT INTO products (name,slug,price,category_id,stock) VALUES ('Other','other',20,$1,10) RETURNING id", [category]))[0].id;
  });
  async function pages(count = 1): Promise<{ context: BrowserContext; pages: Page[] }> {
    const context = await browser.newContext(); const tabs = await Promise.all(Array.from({ length: count }, () => context.newPage()));
    await Promise.all(tabs.map(page => page.goto(origin)));
    await tabs[0].evaluate(({ productId }) => (globalThis as any).localStorage.setItem('elecshop_guest_cart', JSON.stringify([
      { product_id: productId, quantity: 2, expires_at: new Date(Date.now() + 3600000).toISOString() } ])), { productId });
    return { context, pages: tabs };
  }
  const prepare = (page: Page, retryOf?: string) => page.evaluate(({ userId, retryOf }) => (globalThis as any).GuestCart.prepareGuestMerge(userId, retryOf), { userId, retryOf });
  const submit = (page: Page, attempt: any, actor = userId) => page.evaluate(async ({ attempt, actor }) => {
    const response = await fetch('/merge', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.key }, body: JSON.stringify({ userId: actor, items: attempt.items }) });
    const result: any = await response.json(); if (!response.ok) throw new Error(result.code); return result;
  }, { attempt, actor });
  const confirm = (page: Page, attempt: any, result: any) => page.evaluate(({ attempt, result }) => (globalThis as any).GuestCart.confirmGuestMerge(attempt.key, result), { attempt, result });
  const saved = (page: Page) => page.evaluate(() => JSON.parse((globalThis as any).localStorage.getItem('elecshop_guest_cart')));

  it('replays a lost committed response without adding quantities again', async () => {
    const attempt = key(); const first = await merge(userId, attempt, input());
    const replay = await merge(userId, attempt, input());
    assert.equal(replay.replayed, true); assert.deepEqual(replay.accepted, first.accepted); assert.equal(await quantity(), 2); assert.equal(await receiptCount(), 1);
  });
  it('atomically deduplicates simultaneous submissions of the same attempt', async () => {
    const attempt = key(); const results = await Promise.all(Array.from({ length: 8 }, () => merge(userId, attempt, input())));
    assert.equal(results.filter(result => !result.replayed).length, 1); assert.equal(await quantity(), 2); assert.equal(await receiptCount(), 1);
  });
  it('rejects conflicting key reuse and scopes identical keys to separate users', async () => {
    const attempt = key(); await merge(userId, attempt, input());
    await assert.rejects(merge(userId, attempt, input(3)), (error: any) => error.code === 'IDEMPOTENCY_CONFLICT');
    const other = (await read<{ id: string }>("INSERT INTO users (name,email) VALUES ('Synthetic two','two@example.test') RETURNING id"))[0].id;
    assert.equal((await merge(other, attempt, input())).replayed, false);
    assert.equal(await quantity(), 2); assert.equal(await quantity(other), 2); assert.equal(await receiptCount(), 2);
  });
  it('accepts complete normalized lines and explicitly rejects unavailable, duplicate-limit and stock failures', async () => {
    const variant = (await read<{ id: string }>("INSERT INTO product_variants (product_id,sku,name,price,stock,is_active) VALUES ($1,'retired','Retired',15,5,false) RETURNING id", [productId]))[0].id;
    const lines = [...input(1), { ...input(2)[0], productId: productId.toUpperCase() },
      { productId, variantId: variant, quantity: 1 }, { productId: otherProductId, variantId: null, quantity: 99 },
      { productId: otherProductId, variantId: null, quantity: 1 }, { productId: randomUUID(), variantId: null, quantity: 1 }];
    const result = await merge(userId, key(), lines);
    assert.equal(result.accepted.length, 1); assert.equal(result.accepted[0].quantity, 3); assert.equal(await quantity(), 3);
    assert.deepEqual(result.rejected.map(line => line.reason).sort(), ['PRODUCT_UNAVAILABLE', 'QUANTITY_LIMIT', 'VARIANT_UNAVAILABLE']);
    assert.equal((await merge(userId, key(), input(8))).rejected[0].reason, 'INSUFFICIENT_STOCK'); assert.equal(await quantity(), 3);
  });
  it('rejects wrong-product/missing variants, preserves valid variants and applies expiry rules', async () => {
    const variant = (await read<{ id: string }>("INSERT INTO product_variants (product_id,sku,name,price,stock) VALUES ($1,'valid','Valid',15,5) RETURNING id", [productId]))[0].id;
    const result = await merge(userId, key(), [{ productId, variantId: variant, quantity: 2 }, { productId: otherProductId, variantId: variant, quantity: 1 },
      { productId, variantId: randomUUID(), quantity: 1 }, { productId, variantId: null, quantity: 1, expiresAt: '2000-01-01T00:00:00Z' }]);
    assert.equal(result.accepted.length, 1); assert.equal(result.accepted[0].variantId, variant);
    assert.deepEqual(result.rejected.map(line => line.reason).sort(), ['EXPIRED', 'VARIANT_UNAVAILABLE', 'VARIANT_UNAVAILABLE']);
    assert.equal((await cart.getCart(userId)).items[0].price, '15.00');
  });
  it('enforces total authenticated line limit and safely replaces owned expired rows', async () => {
    await read('UPDATE products SET stock=200 WHERE id=$1', [productId]);
    const row = await cart.addToCart(userId, productId, 98);
    assert.equal((await merge(userId, key(), input(2))).rejected[0].reason, 'QUANTITY_LIMIT'); assert.equal(await quantity(), 98);
    await read("UPDATE cart_items SET expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1", [row.id]);
    assert.equal((await merge(userId, key(), input(2))).accepted.length, 1); assert.equal(await quantity(), 2);
  });
  it('rolls back accepted lines and the claim when receipt persistence fails; same key can retry', async () => {
    await read("CREATE FUNCTION synthetic_merge_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$");
    await read('CREATE TRIGGER synthetic_failure BEFORE UPDATE ON cart_merge_requests FOR EACH ROW EXECUTE FUNCTION synthetic_merge_failure()');
    const attempt = key();
    try { await assert.rejects(merge(userId, attempt, [...input(), { productId: otherProductId, variantId: null, quantity: 1 }]));
      assert.equal(await quantity(), 0); assert.equal(await quantity(userId, otherProductId), 0); assert.equal(await receiptCount(), 0);
    } finally { await read('DROP TRIGGER synthetic_failure ON cart_merge_requests'); await read('DROP FUNCTION synthetic_merge_failure()'); }
    assert.equal((await merge(userId, attempt, input())).replayed, false); assert.equal(await quantity(), 2);
  });
  it('serializes distinct attempts and regular cart additions against current stock', async () => {
    const results = await Promise.all([merge(userId, key(), input(6)), merge(userId, key(), input(6))]);
    assert.equal(results.reduce((n, result) => n + result.accepted.length, 0), 1); assert.equal(await quantity(), 6);
    await Promise.all([merge(userId, key(), input(2)), cart.addToCart(userId, productId, 1)]);
    assert.equal(await quantity(), 9);
  });
  it('replay never repopulates merged quantities already consumed by checkout', async () => {
    const attempt = key(); await merge(userId, attempt, input()); const row = (await cart.getCart(userId)).items[0];
    await orders.placeOrder(userId, syntheticAddress, 'cod', { idempotencyKey: key(), items: [{ productId, quantity: 2, cartItemId: row.id }] });
    assert.equal(await quantity(), 0); assert.equal((await merge(userId, attempt, input())).replayed, true); assert.equal(await quantity(), 0);
  });
  it('native browser reload retries response loss with the durable key and confirms once', async () => {
    const fixture = await pages(); const page = fixture.pages[0];
    try {
      const attempt = await prepare(page); dropResponse = true; await assert.rejects(submit(page, attempt)); dropResponse = false;
      assert.equal(await quantity(), 2); assert.equal((await saved(page)).merge.status, 'pending');
      await page.reload(); const retry = await prepare(page); assert.equal(retry.key, attempt.key);
      const result = await submit(page, retry); assert.equal(result.replayed, true);
      await confirm(page, retry, result); await confirm(page, retry, result);
      assert.equal((await saved(page)).items.length, 0); assert.equal((await saved(page)).merge.status, 'confirmed');
      await page.reload(); assert.equal((await prepare(page)).key, undefined); assert.equal(await quantity(), 2);
    } finally { await fixture.context.close(); }
  });
  it('native simultaneous tabs share one attempt and preserve additions during transfer', async () => {
    const fixture = await pages(2); const [one, two] = fixture.pages;
    try {
      const [a, b] = await Promise.all([prepare(one), prepare(two)]); assert.equal(a.key, b.key);
      await two.evaluate(() => (globalThis as any).GuestCart.mutateGuestCart((items: any[]) => { items[0].quantity += 3; return items; }));
      const results = await Promise.all([submit(one, a), submit(two, b)]);
      await Promise.all([confirm(one, a, results[0]), confirm(two, b, results[1])]);
      assert.equal(await quantity(), 2); assert.equal((await saved(one)).items[0].quantity, 3);
      await one.reload(); assert.equal((await prepare(one)).key, undefined);
      const [c, d] = await Promise.all([prepare(one, a.key), prepare(two, a.key)]); assert.equal(c.key, d.key); assert.notEqual(c.key, a.key);
      const more = await Promise.all([submit(one, c), submit(two, d)]); await Promise.all([confirm(one, c, more[0]), confirm(two, d, more[1])]);
      assert.equal(await quantity(), 5); assert.equal((await saved(one)).items.length, 0);
      // A late retry button carrying the old confirmed key cannot start a third transfer.
      assert.equal((await prepare(two, a.key)).key, undefined);
    } finally { await fixture.context.close(); }
  });
  it('native browser preserves rejected items and never automatically retries a confirmed partial result', async () => {
    const fixture = await pages(); const page = fixture.pages[0];
    try {
      await page.evaluate(({ otherProductId }) => (globalThis as any).GuestCart.mutateGuestCart((items: any[]) => [...items, { product_id: otherProductId, quantity: 11 }]), { otherProductId });
      const a = await prepare(page); const result = await submit(page, a); const confirmed = await confirm(page, a, result);
      assert.equal(confirmed.remaining, 11); assert.equal(confirmed.rejected[0].reason, 'INSUFFICIENT_STOCK');
      await page.reload(); assert.equal((await prepare(page)).key, undefined); assert.equal(await quantity(), 2);
      await read('UPDATE products SET stock=20 WHERE id=$1', [otherProductId]);
      const retry = await prepare(page, a.key); assert.notEqual(retry.key, a.key); await confirm(page, retry, await submit(page, retry));
      assert.equal(await quantity(userId, otherProductId), 11); assert.equal((await saved(page)).items.length, 0);
    } finally { await fixture.context.close(); }
  });
  it('native browser storage failure before send preserves cart; failure after commit retains retry identity', async () => {
    const fixture = await pages(); const page = fixture.pages[0];
    try {
      await page.evaluate(() => { (globalThis as any).originalSetItem = (globalThis as any).Storage.prototype.setItem; (globalThis as any).Storage.prototype.setItem = () => { throw new Error('synthetic storage failure'); }; });
      await assert.rejects(prepare(page)); assert.equal(await receiptCount(), 0);
      await page.reload(); const attempt = await prepare(page); const result = await submit(page, attempt);
      await page.evaluate(() => { (globalThis as any).Storage.prototype.setItem = () => { throw new Error('synthetic storage failure'); }; });
      await assert.rejects(confirm(page, attempt, result)); assert.equal(await quantity(), 2);
      await page.reload(); const retry = await prepare(page); assert.equal(retry.key, attempt.key); await confirm(page, retry, await submit(page, retry));
      assert.equal((await saved(page)).items.length, 0); assert.equal(await quantity(), 2);
    } finally { await fixture.context.close(); }
  });
  it('native browser does not subtract a removed and re-added line, or transfer a pending attempt to another account', async () => {
    const fixture = await pages(); const page = fixture.pages[0];
    try {
      const attempt = await prepare(page);
      await page.evaluate(({ productId }) => (globalThis as any).GuestCart.mutateGuestCart(() => [{ product_id: productId, quantity: 4 }]), { productId });
      await assert.rejects(page.evaluate(({ other }) => (globalThis as any).GuestCart.prepareGuestMerge(other), { other: randomUUID() }));
      await assert.rejects(submit(page, attempt, randomUUID()), /MERGE_USER_CHANGED/); assert.equal(await receiptCount(), 0);
      await confirm(page, attempt, await submit(page, attempt)); assert.equal((await saved(page)).items[0].quantity, 4); assert.equal(await quantity(), 2);
    } finally { await fixture.context.close(); }
  });
  it('native browser reconciles duplicate legacy lines exactly once', async () => {
    const fixture = await pages(); const page = fixture.pages[0];
    try {
      await page.evaluate(({ productId }) => (globalThis as any).localStorage.setItem('elecshop_guest_cart', JSON.stringify([
        { product_id: productId, quantity: 2 }, { product_id: productId.toUpperCase(), variant_id: null, quantity: 3 } ])), { productId });
      const attempt = await prepare(page); const result = await submit(page, attempt);
      assert.equal(result.accepted.length, 1); assert.equal(result.accepted[0].quantity, 5);
      await confirm(page, attempt, result); await confirm(page, attempt, result);
      assert.equal((await saved(page)).items.length, 0); assert.equal(await quantity(), 5);
    } finally { await fixture.context.close(); }
  });
  it('saved rejection replays unchanged after inventory recovers; only a new attempt applies it', async () => {
    await read('UPDATE products SET stock=0 WHERE id=$1', [productId]);
    const attempt = key(); const first = await merge(userId, attempt, input());
    assert.equal(first.accepted.length, 0); assert.equal(first.rejected[0].reason, 'INSUFFICIENT_STOCK');
    await read('UPDATE products SET stock=10 WHERE id=$1', [productId]);
    const replay = await merge(userId, attempt, input()); assert.equal(replay.replayed, true); assert.deepEqual(replay.rejected, first.rejected); assert.equal(await quantity(), 0);
    assert.equal((await merge(userId, key(), input())).accepted.length, 1); assert.equal(await quantity(), 2);
  });
  it('native browser fails closed without cross-tab locking and preserves malformed storage', async () => {
    const fixture = await pages(); const page = fixture.pages[0];
    try {
      await page.evaluate(() => Object.defineProperty((globalThis as any).navigator, 'locks', { value: undefined, configurable: true }));
      await assert.rejects(prepare(page), /Web Locks/); assert.equal(await receiptCount(), 0);
      await page.reload(); await page.evaluate(() => (globalThis as any).localStorage.setItem('elecshop_guest_cart', '{malformed'));
      await assert.rejects(prepare(page)); assert.equal(await page.evaluate(() => (globalThis as any).localStorage.getItem('elecshop_guest_cart')), '{malformed');
    } finally { await fixture.context.close(); }
  });
});
