import assert from 'node:assert/strict';
import { before, after, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { ShippingAddress } from '../src/services/orders.service';

// This suite never falls back to DATABASE_URL or loads dotenv. Explicitly verify
// the newly created, empty, synthetic local database before setting these vars.
const databaseUrl = process.env.PHASE3_DISPOSABLE_DATABASE_URL;
const verified = process.env.PHASE3_DISPOSABLE_DATABASE_VERIFIED === 'yes';
const enabled = Boolean(databaseUrl) && verified;
const skip = enabled ? false : 'Integration acceptance blocked: verified disposable PostgreSQL was not supplied';
function stub(path: string, exports: unknown) {
  const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
let db: typeof import('../src/config/db');
let setupPool: Pool;
let orders: typeof import('../src/services/orders.service');
let cart: typeof import('../src/services/cart.service');
let read: typeof import('../src/config/db').query;
let cacheMode = ''; let cacheCalls: string[][] = [];
let checkoutGate: { entered: () => void; wait: Promise<void> } | null = null;
const schema = 'phase3_acceptance_' + randomUUID().replace(/-/g, '');
const address: ShippingAddress = { fullName: 'Synthetic Customer', phone: '0000000000', addressLine1: 'Synthetic Address', city: 'Beirut', country: 'Lebanon' };
let userId: string; let productId: string; let otherProductId: string; let cartItemId: number;
const guest = (key: string, quantity = 1, extra = {}) => orders.placeGuestOrder('synthetic@example.test',
  [{ productId, quantity }], address, 'cash_on_delivery', { idempotencyKey: key, ...extra });
const auth = (key: string, rowId = cartItemId, extra = {}) => orders.placeOrder(userId, address, 'cash_on_delivery',
  { idempotencyKey: key, items: [{ productId, quantity: 1, cartItemId: rowId }], ...extra });
const key = () => randomUUID();
async function count(table: string) {
  assert.ok(['orders', 'checkout_requests', 'coupon_usage'].includes(table));
  return Number((await read<{ count: string }>('SELECT COUNT(*) AS count FROM ' + table))[0].count);
}
const stock = async () => (await read<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId]))[0].stock;

// External cache/logger/error dependencies are replaced; transactions, locks,
// unique constraints, stock, coupons and cart writes use actual PostgreSQL.
describe('checkout PostgreSQL acceptance', { skip, concurrency: false }, () => {
  before(async () => {
    const target = new URL(databaseUrl!);
    assert.ok(['postgres:', 'postgresql:'].includes(target.protocol), 'Expected PostgreSQL URL');
    assert.ok(['127.0.0.1', '[::1]'].includes(target.hostname), 'Only literal loopback database hosts are allowed');
    assert.equal(target.pathname, '/connect_shop_phase3_disposable', 'Database must have the dedicated disposable name');
    assert.equal(target.search, '', 'Connection options are not allowed in the acceptance target');
    stub('../src/config/env', { env: { DATABASE_URL: databaseUrl, DB_STATEMENT_TIMEOUT_MS: 10000, REDIS_CACHE_TIMEOUT_MS: 30 } });
    stub('../src/utils/logger', { logger: { info() {}, warn() {}, error() {} } });
    stub('../src/utils/performance', { logSlowQuery() {} });
    db = require('../src/config/db'); // Actual application pool and transaction wrapper.
    // DDL setup uses the existing migration pool option; request transactions
    // still use the actual application pool with its normal 10-second limit.
    setupPool = new (require('pg').Pool)(db.buildPoolConfig(databaseUrl!, { statementTimeoutMs: 0 }));
    const client = await setupPool.connect();
    try {
      assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'connect_shop_phase3_disposable');
      assert.equal((await client.query('SHOW transaction_isolation')).rows[0].transaction_isolation, 'read committed');
      const existing = await client.query(
        "SELECT COUNT(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'");
      assert.equal(existing.rows[0].count, 0, 'The disposable database must start empty; no existing customer tables are permitted');
      assert.match(schema, /^phase3_acceptance_[0-9a-f]{32}$/);
      await client.query('CREATE SCHEMA "' + schema + '"');
      await client.query('SET search_path TO "' + schema + '", public');
      await client.query(readFileSync(require.resolve('../src/db/schema.sql'), 'utf8'));
      assert.ok((await client.query("SELECT to_regclass('checkout_requests') AS table_name")).rows[0].table_name);
      // Exercise the upgrade case too: existing order tables without the new
      // claim table, then run the actual additive migration to create it.
      await client.query('DROP TABLE checkout_requests');
      await client.query(readFileSync(require.resolve('../src/db/migrations/013_checkout_idempotency.sql'), 'utf8'));
      const { runMigrations } = require('../src/db/migrate') as typeof import('../src/db/migrate');
      await runMigrations(client);
      // Verify additive migration remains compatible/idempotent on a fresh schema.
      await client.query(readFileSync(require.resolve('../src/db/migrations/013_checkout_idempotency.sql'), 'utf8'));
    } finally { client.release(); }
    const transaction: typeof db.withTransaction = work => db.withTransaction(async client => {
      await client.query('SET LOCAL search_path TO "' + schema + '", public');
      const proxy = new Proxy(client, { get(target, property, receiver) {
        if (property !== 'query') return Reflect.get(target, property, receiver);
        return async (sql: string, values?: unknown[]) => {
          const result = await target.query(sql, values);
          if (checkoutGate && sql.includes('SELECT ci.id,') && sql.includes('FROM cart_items ci')) {
            const gate = checkoutGate; checkoutGate = null; gate.entered(); await gate.wait;
          }
          return result;
        };
      } });
      return work(proxy as PoolClient);
    });
    read = (sql, values) => transaction(async client => (await client.query(sql, values)).rows);
    stub('../src/config/db', { ...db, query: read, withTransaction: transaction });
    class AppError extends Error { constructor(message: string, public statusCode: number, _op = true, public code?: string) { super(message); } }
    stub('../src/utils/errors', { AppError, NotFoundError: class extends AppError { constructor() { super('Not found', 404); } } });
    stub('../src/services/products.service', { invalidateProductCaches: async (slugs: string[]) => {
      cacheCalls.push(slugs);
      if (cacheMode === 'fail') throw new Error('Synthetic cache failure');
      if (cacheMode === 'hang') return new Promise<never>(() => {});
    } });
    orders = require('../src/services/orders.service'); cart = require('../src/services/cart.service');
  });
  after(async () => {
    if (!db) return;
    try {
      assert.match(schema, /^phase3_acceptance_[0-9a-f]{32}$/);
      if (setupPool) await setupPool.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
    } finally { if (setupPool) await setupPool.end(); await db.pool.end(); }
  });
  beforeEach(async () => {
    cacheMode = ''; cacheCalls = []; checkoutGate = null;
    const fixtureClient = await setupPool.connect();
    try {
      await fixtureClient.query('SET search_path TO "' + schema + '", public');
      // Delete only synthetic fixture data. TRUNCATE CASCADE recreates every
      // dependent table and is disproportionately slow on this local disk.
      await fixtureClient.query('DELETE FROM checkout_requests; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM coupons; DELETE FROM products; DELETE FROM users; DELETE FROM categories');
    } finally { fixtureClient.release(); }
    userId = (await read<{ id: string }>("INSERT INTO users (name, email) VALUES ('Synthetic Customer', 'synthetic@example.test') RETURNING id"))[0].id;
    const category = (await read<{ id: number }>("INSERT INTO categories (name, slug) VALUES ('Synthetic', 'synthetic') RETURNING id"))[0].id;
    productId = (await read<{ id: string }>("INSERT INTO products (name, slug, price, category_id, stock) VALUES ('Synthetic', 'synthetic-product', 10, $1, 10) RETURNING id", [category]))[0].id;
    otherProductId = (await read<{ id: string }>("INSERT INTO products (name, slug, price, category_id, stock) VALUES ('Other synthetic', 'other-synthetic', 20, $1, 10) RETURNING id", [category]))[0].id;
    cartItemId = (await cart.addToCart(userId, productId, 1)).id;
    await read("INSERT INTO coupons (code, type, value, usage_limit) VALUES ('TEST', 'percent', 10, 5)");
  });
  it('repeated guest submissions return one saved order and consume stock/coupon once', async () => {
    const attempt = key(); const first = await guest(attempt, 1, { couponCode: 'test' });
    const second = await guest(attempt, 1, { couponCode: ' TEST ' });
    assert.equal(first.order.id, second.order.id); assert.equal(second.replayed, true);
    assert.equal(first.order.total, '12.99'); assert.equal(await count('orders'), 1); assert.equal(await stock(), 9);
    assert.equal(await count('coupon_usage'), 1); assert.equal(await count('checkout_requests'), 1);
    assert.equal(Number((await read('SELECT used_count FROM coupons WHERE code = $1', ['TEST']))[0].used_count), 1);
  });
  it('scopes the same key to separate guest and authenticated checkout identities', async () => {
    const attempt = key(); const one = await guest(attempt); const two = await auth(attempt);
    assert.notEqual(one.order.id, two.order.id); assert.equal(await count('orders'), 2);
    assert.equal(await count('checkout_requests'), 2); assert.equal(await stock(), 8);
  });
  it('preserves variant pricing/stock and ignores client price fields', async () => {
    const variant = (await read<{ id: string }>("INSERT INTO product_variants (product_id, sku, name, price, stock) VALUES ($1, 'synthetic-variant', 'Synthetic variant', 15, 3) RETURNING id", [productId]))[0].id;
    const result = await orders.placeGuestOrder('synthetic@example.test',
      [{ productId, variantId: variant, quantity: 1, price: 0 } as any], address, 'cash_on_delivery', { idempotencyKey: key() });
    assert.equal(result.order.total, '19.65'); assert.equal(await stock(), 10);
    assert.equal((await read('SELECT stock FROM product_variants WHERE id = $1', [variant]))[0].stock, 2);
    assert.equal((await read('SELECT price_at_purchase FROM order_items WHERE order_id = $1', [result.order.id]))[0].price_at_purchase, '15.00');
  });
  it('concurrent different-key guest checkouts cannot oversell locked stock', async () => {
    const results = await Promise.allSettled([guest(key(), 6), guest(key(), 6)]);
    assert.deepEqual(results.map(result => result.status).sort(), ['fulfilled', 'rejected']);
    assert.equal(await count('orders'), 1); assert.equal(await stock(), 4);
  });
  it('simultaneous same-key guest submissions are enforced by the unique constraint', async () => {
    const attempt = key(); const results = await Promise.all([guest(attempt), guest(attempt)]);
    assert.equal(results[0].order.id, results[1].order.id);
    assert.deepEqual(results.map(result => result.replayed).sort(), [false, true]);
    assert.equal(await count('orders'), 1); assert.equal(await stock(), 9);
  });
  it('simultaneous same-key authenticated submissions replay after cart consumption', async () => {
    const attempt = key(); const results = await Promise.all([auth(attempt), auth(attempt)]);
    assert.equal(results[0].order.id, results[1].order.id); assert.equal(await count('orders'), 1);
    assert.equal((await cart.getCart(userId)).itemCount, 0); assert.equal(await stock(), 9);
  });
  it('different keys cannot purchase the same authenticated cart snapshot twice', async () => {
    const results = await Promise.allSettled([auth(key()), auth(key())]);
    assert.deepEqual(results.map(result => result.status).sort(), ['fulfilled', 'rejected']);
    assert.equal(await count('orders'), 1); assert.equal(await stock(), 9);
    assert.equal(await count('checkout_requests'), 1);
  });
  it('conflicting reuse rejects without consuming stock or creating another order', async () => {
    const attempt = key(); await guest(attempt);
    await assert.rejects(guest(attempt, 2), (error: any) => error.code === 'IDEMPOTENCY_CONFLICT');
    assert.equal(await count('orders'), 1); assert.equal(await stock(), 9);
  });
  it('a failure before commit rolls back order, stock, coupon, cart and claim; same-key retry succeeds', async () => {
    await read("CREATE FUNCTION phase3_fail_finalize() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic before-commit failure'; END $$");
    await read('CREATE TRIGGER phase3_fail_finalize BEFORE UPDATE ON checkout_requests FOR EACH ROW EXECUTE FUNCTION phase3_fail_finalize()');
    const attempt = key();
    try {
      await assert.rejects(auth(attempt, cartItemId, { couponCode: 'TEST' }));
      assert.equal(await count('orders'), 0); assert.equal(await stock(), 10);
      assert.equal(await count('coupon_usage'), 0); assert.equal(await count('checkout_requests'), 0);
      assert.equal((await cart.getCart(userId)).itemCount, 1);
    } finally {
      await read('DROP TRIGGER phase3_fail_finalize ON checkout_requests'); await read('DROP FUNCTION phase3_fail_finalize()');
    }
    assert.equal((await auth(attempt, cartItemId, { couponCode: 'TEST' })).replayed, false);
    assert.equal(await count('orders'), 1); assert.equal(await stock(), 9);
  });
  it('a cache failure or stall after commit remains successful and replay retries maintenance', async () => {
    const attempt = key(); cacheMode = 'fail'; const first = await guest(attempt);
    cacheMode = 'hang'; const second = await guest(attempt);
    cacheMode = ''; const third = await guest(attempt);
    assert.equal(first.order.id, second.order.id); assert.equal(second.order.id, third.order.id);
    assert.equal(third.replayed, true); assert.equal(await count('orders'), 1); assert.equal(await stock(), 9);
    assert.equal(cacheCalls.length, 3);
  });
  it('same-SKU and other-product additions waiting during checkout survive snapshot consumption', async () => {
    let entered!: () => void; let release!: () => void;
    const captured = new Promise<void>(resolve => { entered = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    checkoutGate = { entered, wait };
    const buying = auth(key()); let additionsFinished = 0;
    await captured;
    const additions = Promise.all([cart.addToCart(userId, productId, 2), cart.addToCart(userId, otherProductId, 1)])
      .then(result => { additionsFinished++; return result; });
    try {
      // Observe actual advisory lock waiters, rather than equating promise timing
      // with a proven race. This is a database acceptance condition, not a benchmark.
      const deadline = Date.now() + 3000;
      let waiting = 0;
      while (!waiting && Date.now() < deadline) {
        waiting = Number((await read("SELECT COUNT(*) AS count FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'elecshop-api' AND wait_event = 'advisory'"))[0].count);
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.ok(waiting > 0, 'Cart additions must wait on the checkout cart lock');
      assert.equal(additionsFinished, 0);
    } finally { release(); await Promise.allSettled([buying, additions]); }
    await buying; await additions;
    const current = await cart.getCart(userId);
    assert.equal(current.items.find(item => item.product_id === productId)?.quantity, 2);
    assert.equal(current.items.find(item => item.product_id === otherProductId)?.quantity, 1);
    assert.notEqual(current.items.find(item => item.product_id === productId)?.id, cartItemId);
    assert.equal(await stock(), 9);
  });
  it('old row IDs cannot checkout an identical-looking replacement cart under a different key', async () => {
    await auth(key()); await cart.addToCart(userId, productId, 1);
    await assert.rejects(auth(key()), (error: any) => error.code === 'CART_CHANGED');
    assert.equal(await count('orders'), 1); assert.equal((await cart.getCart(userId)).itemCount, 1);
  });
  it('cart additions before the snapshot cause a conflict instead of silently expanding the purchase', async () => {
    await cart.addToCart(userId, productId, 1);
    await assert.rejects(auth(key()), (error: any) => error.code === 'CART_CHANGED');
    assert.equal(await count('orders'), 0); assert.equal((await cart.getCart(userId)).itemCount, 2);
  });
});
