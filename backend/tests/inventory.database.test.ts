import assert from 'node:assert/strict';
import { before, after, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { ShippingAddress } from '../src/services/orders.service';
import type { Product, ProductVariant } from '../src/services/products.service';

// This suite never falls back to DATABASE_URL or loads dotenv. Explicitly verify
// the newly created, empty, synthetic local database before setting these vars.
const databaseUrl = process.env.PHASE4_DISPOSABLE_DATABASE_URL;
const verified = process.env.PHASE4_DISPOSABLE_DATABASE_VERIFIED === 'yes';
const enabled = Boolean(databaseUrl) && verified;
const skip = enabled ? false : 'Integration acceptance blocked: verified disposable PostgreSQL was not supplied';
function stub(path: string, exports: unknown) {
  const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
let db: typeof import('../src/config/db');
let setupPool: Pool;
let orders: typeof import('../src/services/orders.service');
let cart: typeof import('../src/services/cart.service');
let repository: typeof import('../src/repositories/product.repository').ProductRepository;
let admin: typeof import('../src/services/admin.service');
let read: typeof import('../src/config/db').query;
let cacheMode = ''; let cacheCalls: string[][] = [];
let checkoutGate: { entered: () => void; wait: Promise<void> } | null = null;
const schema = 'phase4_acceptance_' + randomUUID().replace(/-/g, '');
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
describe('inventory PostgreSQL acceptance', { skip, concurrency: false }, () => {
  before(async () => {
    const target = new URL(databaseUrl!);
    assert.ok(['postgres:', 'postgresql:'].includes(target.protocol), 'Expected PostgreSQL URL');
    assert.ok(['127.0.0.1', '[::1]'].includes(target.hostname), 'Only literal loopback database hosts are allowed');
    assert.equal(target.pathname, '/connect_shop_phase4_disposable', 'Database must have the dedicated disposable name');
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
      assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'connect_shop_phase4_disposable');
      assert.equal((await client.query('SHOW transaction_isolation')).rows[0].transaction_isolation, 'read committed');
      const existing = await client.query(
        "SELECT COUNT(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'");
      assert.equal(existing.rows[0].count, 0, 'The disposable database must start empty; no existing customer tables are permitted');
      assert.match(schema, /^phase4_acceptance_[0-9a-f]{32}$/);
      await client.query('CREATE SCHEMA "' + schema + '"');
      await client.query('SET search_path TO "' + schema + '", public');
      // Upgrade from the actual Phase 3 schema, then verify reapplication.
      await client.query(readFileSync(require.resolve('../src/db/schema.sql'), 'utf8').split('-- Phase 4 inventory and variant integrity')[0]);
      assert.ok((await client.query("SELECT to_regclass('checkout_requests') AS table_name")).rows[0].table_name);
      // Exercise the upgrade case too: existing order tables without the new
      // claim table, then run the actual additive migration to create it.
      await client.query('DROP TABLE checkout_requests');
      await client.query(readFileSync(require.resolve('../src/db/migrations/013_checkout_idempotency.sql'), 'utf8'));
      const { runMigrations } = require('../src/db/migrate') as typeof import('../src/db/migrate');
      await runMigrations(client);
      // Verify additive migration remains compatible/idempotent on a fresh schema.
      await client.query(readFileSync(require.resolve('../src/db/migrations/014_inventory_variant_integrity.sql'), 'utf8'));
    } finally { client.release(); }
    const transaction: typeof db.withTransaction = work => db.withTransaction(async client => {
      await client.query('SET LOCAL search_path TO "' + schema + '", public');
      const proxy = new Proxy(client, { get(target, property, receiver) {
        if (property !== 'query') return Reflect.get(target, property, receiver);
        return async (sql: string, values?: unknown[]) => {
          const result = await target.query(sql, values);
          if (checkoutGate && sql.includes('FROM products p') && sql.includes('FOR UPDATE')) {
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
    stub('../src/utils/errors', { AppError, ForbiddenError: class extends AppError {}, ConflictError: class extends AppError {}, NotFoundError: class extends AppError { constructor() { super('Not found', 404); } } });
    stub('../src/services/products.service', { invalidateProductCaches: async (slugs: string[]) => {
      cacheCalls.push(slugs);
      if (cacheMode === 'fail') throw new Error('Synthetic cache failure');
      if (cacheMode === 'hang') return new Promise<never>(() => {});
    } });
    stub('../src/config/redis', { delCache: async () => {} });
    orders = require('../src/services/orders.service'); cart = require('../src/services/cart.service');
    repository = require('../src/repositories/product.repository').ProductRepository;
    admin = require('../src/services/admin.service');
  });
  after(async () => {
    if (!db) return;
    try {
      assert.match(schema, /^phase4_acceptance_[0-9a-f]{32}$/);
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
  async function product() { const row = (await read<Product>('SELECT * FROM products WHERE id = $1', [productId]))[0]; return { ...row, variants: undefined, price: Number(row.price), compare_at_price: row.compare_at_price === null ? null : Number(row.compare_at_price) }; }
  async function variant(id: string) { const row = (await read<ProductVariant>('SELECT * FROM product_variants WHERE id = $1', [id]))[0]; return { ...row, price: Number(row.price) }; }
  async function addVariant(sku = 'synthetic-variant', parent = productId) {
    const row = (await read<ProductVariant>("INSERT INTO product_variants (product_id, sku, name, price, stock) VALUES ($1, $2, 'Synthetic variant', 15, 5) RETURNING *", [parent, sku]))[0]; return { ...row, price: Number(row.price) };
  }
  async function buyVariant(id: string) {
    return orders.placeGuestOrder('synthetic@example.test', [{ productId, variantId: id, quantity: 1 }], address, 'cod', { idempotencyKey: key() });
  }
  async function state(id: string) {
    return { order: (await read('SELECT * FROM orders WHERE id = $1', [id]))[0],
      history: await read('SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY id', [id]),
      stock: await stock(), inventoryVersion: (await product()).inventory_version, variants: await read('SELECT * FROM product_variants ORDER BY id') };
  }
  it('preserves variant IDs, live carts and purchase snapshots when content is edited', async () => {
    const saved = await addVariant(); const row = await cart.addToCart(userId, productId, 1, saved.id);
    const bought = await buyVariant(saved.id); const before = await product();
    const content = { ...saved, name: 'Edited variant', price: 18, stock: undefined };
    await repository.update(productId, { ...before, stock: undefined, name: 'Edited product', variants: [content] });
    assert.equal((await variant(saved.id)).stock, 4);
    assert.equal((await variant(saved.id)).inventory_version, 1);
    assert.equal((await cart.getCart(userId)).items.find(item => item.id === row.id)?.variant_id, saved.id);
    const history = (await read('SELECT * FROM order_items WHERE order_id = $1', [bought.order.id]))[0];
    assert.equal(history.variant_id, saved.id); assert.equal(history.variant_name, 'Synthetic variant'); assert.equal(history.price_at_purchase, '15.00');
    const result = await orders.placeOrder(userId, address, 'cod', { idempotencyKey: key(), items: [
      { productId, quantity: 1, cartItemId }, { productId, variantId: saved.id, quantity: 1, cartItemId: row.id } ] });
    assert.ok(result.order.id); assert.equal((await variant(saved.id)).stock, 3); assert.equal(await stock(), 9);
  });
  it('creates new variants and retires removed ones without deleting cart or order references', async () => {
    const saved = await addVariant(); const row = await cart.addToCart(userId, productId, 1, saved.id);
    const bought = await buyVariant(saved.id);
    await repository.update(productId, { ...await product(), stock: undefined, variants: [{ sku: 'new-sku', name: 'New', price: 20, stock: 6 }] });
    assert.equal((await variant(saved.id)).is_active, false);
    const all = await read('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sku', [productId]);
    assert.equal(all.length, 2); assert.notEqual(all.find(item => item.sku === 'new-sku')!.id, saved.id);
    assert.equal((await cart.getCart(userId)).items.find(item => item.id === row.id)?.stock, 0);
    assert.equal((await read('SELECT variant_id FROM order_items WHERE order_id = $1', [bought.order.id]))[0].variant_id, saved.id);
    await assert.rejects(buyVariant(saved.id));
    await assert.rejects(cart.addToCart(userId, productId, 1, saved.id));
    await assert.rejects(auth(key(), cartItemId, { items: [{ productId, quantity: 1, cartItemId }, { productId, variantId: saved.id, quantity: 1, cartItemId: row.id }] }));
    await assert.rejects(read('DELETE FROM product_variants WHERE id = $1', [saved.id]), (error: any) => error.code === '23503');
    const cancelled = await admin.updateOrderStatus(bought.order.id, 'cancelled', userId);
    assert.equal(cancelled?.status, 'cancelled'); assert.equal((await variant(saved.id)).stock, 5); assert.equal((await variant(saved.id)).is_active, false);
  });
  it('rejects forged, duplicated, retired and missing variant IDs atomically', async () => {
    const saved = await addVariant(); const foreign = await addVariant('other-sku', otherProductId);
    const original = await product(); const v = { ...saved, stock: undefined };
    for (const variants of [[{ ...v, id: foreign.id }], [v, v], [{ ...v, id: undefined }]]) {
      await assert.rejects(repository.update(productId, { ...original, stock: undefined, name: 'Should rollback', variants }));
      assert.equal((await product()).name, original.name); assert.equal((await variant(saved.id)).is_active, true);
    }
    await repository.update(productId, { ...original, stock: undefined, variants: [] });
    await assert.rejects(repository.update(productId, { ...original, stock: undefined, variants: [v] }), (error: any) => error.code === 'VARIANT_CONFLICT');
  });
  it('content-only product edits and omitted variant lists preserve purchased inventory', async () => {
    const stale = await product(); const saved = await addVariant(); await guest(key());
    await repository.update(productId, { ...stale, stock: undefined, name: 'Content edit' });
    assert.equal(await stock(), 9); assert.equal((await product()).inventory_version, 1); assert.equal((await variant(saved.id)).is_active, true);
    assert.equal((await product()).name, 'Content edit');
  });
  it('stale and unversioned product stock saves cannot undo a purchase; current intentional edits work', async () => {
    const stale = await product(); await guest(key());
    await assert.rejects(repository.update(productId, { ...stale, stock: 20 }), (error: any) => error.code === 'INVENTORY_CONFLICT');
    await assert.rejects(repository.update(productId, { ...stale, inventory_version: undefined }), (error: any) => error.code === 'INVENTORY_VERSION_REQUIRED');
    assert.equal(await stock(), 9);
    await repository.update(productId, { ...await product(), stock: 12 });
    assert.equal(await stock(), 12); assert.equal((await product()).inventory_version, 2);
  });
  it('variant stock saves conflict after purchases and inventory versions catch value ABA', async () => {
    const saved = await addVariant(); const root = await product(); await buyVariant(saved.id);
    await assert.rejects(repository.update(productId, { ...root, stock: undefined, name: 'Rollback', variants: [{ ...saved, stock: 8 }] }), (error: any) => error.code === 'INVENTORY_CONFLICT');
    assert.equal((await product()).name, root.name); assert.equal((await variant(saved.id)).stock, 4);
    await read('UPDATE product_variants SET stock = 5, inventory_version = 0 WHERE id = $1', [saved.id]);
    assert.equal((await variant(saved.id)).stock, saved.stock); assert.equal((await variant(saved.id)).inventory_version, 2);
    await assert.rejects(repository.update(productId, { ...root, stock: undefined, variants: [{ ...saved, stock: 7 }] }), (error: any) => error.code === 'INVENTORY_CONFLICT');
    await repository.update(productId, { ...root, stock: undefined, variants: [{ ...await variant(saved.id), stock: 8 }] });
    assert.equal((await variant(saved.id)).stock, 8); assert.equal((await variant(saved.id)).inventory_version, 3);
  });
  it('an admin save waiting behind an actual checkout stock lock rechecks its inventory version', async () => {
    const stale = await product(); let entered!: () => void; let release!: () => void;
    const captured = new Promise<void>(resolve => { entered = resolve; }); const wait = new Promise<void>(resolve => { release = resolve; });
    checkoutGate = { entered, wait }; const buying = guest(key()); await captured;
    const saving = repository.update(productId, { ...stale, stock: 30, name: 'Stale update' });
    try {
      const deadline = Date.now() + 3000; let waiting = 0;
      while (!waiting && Date.now() < deadline) {
        waiting = Number((await read("SELECT COUNT(*) AS count FROM pg_stat_activity WHERE datname = current_database() AND application_name = 'elecshop-api' AND wait_event = 'transactionid'"))[0].count);
        if (!waiting) await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.ok(waiting > 0, 'Admin save must wait on the checkout row lock');
    } finally { release(); await Promise.allSettled([buying, saving]); }
    await buying; await assert.rejects(saving, (error: any) => error.code === 'INVENTORY_CONFLICT');
    assert.equal(await stock(), 9); assert.equal((await product()).name, stale.name);
  });
  it('repeated and concurrent customer/admin cancellations restore base stock once and preserve payment/coupon state', async () => {
    const bought = await auth(key(), cartItemId, { couponCode: 'TEST' });
    const results = await Promise.all([orders.cancelOrder(userId, bought.order.id), admin.updateOrderStatus(bought.order.id, 'cancelled', userId)]);
    assert.equal(results[0].status, 'cancelled'); assert.equal(results[1]?.status, 'cancelled');
    await orders.cancelOrder(userId, bought.order.id); await admin.updateOrderStatus(bought.order.id, 'cancelled', userId);
    assert.equal(await stock(), 10); assert.equal((await product()).inventory_version, 2);
    const snapshot = await state(bought.order.id); assert.equal(snapshot.order.payment_status, 'pending');
    assert.ok(snapshot.order.cancelled_at); assert.equal(snapshot.history.filter(item => item.status === 'cancelled').length, 1);
    assert.equal(await count('coupon_usage'), 1); assert.equal((await read("SELECT used_count FROM coupons WHERE code='TEST'"))[0].used_count, 1);
  });
  it('concurrent cancellations restore each purchased base/variant quantity to its original row exactly once', async () => {
    const one = await addVariant('one'); const two = await addVariant('two');
    const bought = await orders.placeGuestOrder('synthetic@example.test', [{ productId, quantity: 2 }, { productId, variantId: one.id, quantity: 2 }, { productId, variantId: two.id, quantity: 3 }], address, 'cod', { idempotencyKey: key() });
    await Promise.all([admin.updateOrderStatus(bought.order.id, 'cancelled', userId), admin.updateOrderStatus(bought.order.id, 'cancelled', userId)]);
    assert.equal(await stock(), 10); assert.equal((await variant(one.id)).stock, 5); assert.equal((await variant(two.id)).stock, 5);
    assert.equal((await state(bought.order.id)).history.filter(item => item.status === 'cancelled').length, 1);
  });
  it('enforces forward workflow, terminal states and customer ownership without altering invalid transitions', async () => {
    const bought = await auth(key()); const initial = await state(bought.order.id);
    await assert.rejects(orders.cancelOrder(randomUUID(), bought.order.id)); assert.deepEqual(await state(bought.order.id), initial);
    assert.ok((await admin.getAllOrders()).orders[0].allowed_statuses?.includes('processing'));
    await admin.updateOrderStatus(bought.order.id, 'processing', userId);
    const processing = await state(bought.order.id);
    await assert.rejects(admin.updateOrderStatus(bought.order.id, 'confirmed', userId)); assert.deepEqual(await state(bought.order.id), processing);
    await admin.updateOrderStatus(bought.order.id, 'shipped', userId);
    const shipped = await state(bought.order.id);
    await assert.rejects(orders.cancelOrder(userId, bought.order.id), (error: any) => error.code === 'CANCELLATION_POLICY_REQUIRED'); assert.deepEqual(await state(bought.order.id), shipped);
    await admin.updateOrderStatus(bought.order.id, 'delivered', userId); const delivered = await state(bought.order.id);
    for (const status of ['cancelled', 'shipped', 'confirmed', 'refunded']) {
      await assert.rejects(admin.updateOrderStatus(bought.order.id, status, userId)); assert.deepEqual(await state(bought.order.id), delivered);
    }
    await admin.updateOrderStatus(bought.order.id, 'delivered', userId); assert.deepEqual(await state(bought.order.id), delivered);
    assert.equal(await stock(), 9); assert.deepEqual((await admin.getOrderDetail(bought.order.id))?.allowed_statuses, []);
  });
  it('blocks cancellation requiring financial policy and historical inventory repair', async () => {
    const bought = await guest(key());
    await read("UPDATE orders SET payment_status = 'paid' WHERE id = $1", [bought.order.id]); const paid = await state(bought.order.id);
    await assert.rejects(admin.updateOrderStatus(bought.order.id, 'cancelled', userId), (error: any) => error.code === 'CANCELLATION_POLICY_REQUIRED'); assert.deepEqual(await state(bought.order.id), paid);
    await read("UPDATE orders SET payment_status = 'pending', payment_method = 'card' WHERE id = $1", [bought.order.id]); const card = await state(bought.order.id);
    await assert.rejects(admin.updateOrderStatus(bought.order.id, 'cancelled', userId)); assert.deepEqual(await state(bought.order.id), card);
    await read("UPDATE orders SET payment_method = 'cod' WHERE id = $1", [bought.order.id]);
    await read("UPDATE order_items SET variant_name = 'Legacy lost variant' WHERE order_id = $1", [bought.order.id]); const lost = await state(bought.order.id);
    await assert.rejects(admin.updateOrderStatus(bought.order.id, 'cancelled', userId), (error: any) => error.code === 'INVENTORY_REFERENCE_MISSING'); assert.deepEqual(await state(bought.order.id), lost);
  });
  it('failure recording cancellation history rolls back status, timestamps, stock and inventory version', async () => {
    const bought = await guest(key()); const before = await state(bought.order.id);
    await read("CREATE FUNCTION fail_cancel_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.status='cancelled' THEN RAISE EXCEPTION 'Synthetic history failure'; END IF; RETURN NEW; END $$");
    await read('CREATE TRIGGER fail_cancel_history BEFORE INSERT ON order_status_history FOR EACH ROW EXECUTE FUNCTION fail_cancel_history()');
    try { await assert.rejects(admin.updateOrderStatus(bought.order.id, 'cancelled', userId)); assert.deepEqual(await state(bought.order.id), before); }
    finally { await read('DROP TRIGGER fail_cancel_history ON order_status_history'); await read('DROP FUNCTION fail_cancel_history()'); }
    await admin.updateOrderStatus(bought.order.id, 'cancelled', userId); assert.equal(await stock(), 10);
  });
  it('committed cancellations remain successful when cache invalidation fails or stalls', async () => {
    for (const mode of ['fail', 'hang']) {
      const bought = await guest(key()); cacheMode = mode;
      assert.equal((await admin.updateOrderStatus(bought.order.id, 'cancelled', userId))?.status, 'cancelled');
      assert.equal(await stock(), 10);
    }
    assert.equal(await count('orders'), 2); assert.ok(cacheCalls.length >= 2);
  });
  it('old cancelled orders are not automatically restocked or resurrected by retries', async () => {
    const bought = await guest(key()); await read("UPDATE orders SET status='cancelled' WHERE id=$1", [bought.order.id]); const old = await state(bought.order.id);
    await admin.updateOrderStatus(bought.order.id, 'cancelled', userId); assert.deepEqual(await state(bought.order.id), old); assert.equal(await stock(), 9);
    await assert.rejects(admin.updateOrderStatus(bought.order.id, 'confirmed', userId)); assert.deepEqual(await state(bought.order.id), old);
  });
});
