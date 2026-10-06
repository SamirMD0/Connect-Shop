import assert from 'node:assert/strict';
import { before, after, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { Pool, PoolClient } from 'pg';
import type { Browser, BrowserContext, Page } from '../../frontend/node_modules/@playwright/test';
import type { CheckoutQuote, CheckoutItemInput, ExpectedQuote } from '../src/services/orders.service';

// No dotenv or DATABASE_URL fallback; exact dedicated EMPTY local database only.
const databaseUrl = process.env.PHASE6_DISPOSABLE_DATABASE_URL;
const enabled = Boolean(databaseUrl) && process.env.PHASE6_DISPOSABLE_DATABASE_VERIFIED === 'yes';
const skip = enabled ? false : 'Integration acceptance blocked: verified disposable PostgreSQL was not supplied';
const stub = (path: string, exports: unknown) => { const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule; };
const schema = 'phase6_acceptance_' + randomUUID().replace(/-/g, '');
let db: typeof import('../src/config/db'); let setupPool: Pool; let read: typeof import('../src/config/db').query;
let orders: typeof import('../src/services/orders.service'); let cart: typeof import('../src/services/cart.service');
let auth: typeof import('../src/services/auth.service'); let controller: typeof import('../src/controllers/orders.controller');
let userId: string; let productId: string; let variantId: string;
let browser: Browser; let server: Server; let origin: string; let holdQuote = false; let dropOrder = false;
let pendingQuotes: (() => void)[] = []; let emailFailure = false;
const address = { fullName: 'Synthetic Customer', phone: '0000000000', addressLine1: 'Synthetic Address', city: 'Alpha', state: 'Alpha', country: 'Synthetic Country' };
const items = (quantity = 1): CheckoutItemInput[] => [{ productId, variantId: null, quantity }];
const location = { city: 'Alpha', state: 'Alpha', country: 'Synthetic Country' };
const expected = (quote: CheckoutQuote): ExpectedQuote => ({ subtotal: quote.subtotal, discount_amount: quote.discount_amount, tax_amount: quote.tax_amount, shipping_cost: quote.shipping_cost, total: quote.total, currency: quote.currency });
const guest = (key: string, extra = {}) => orders.placeGuestOrder('synthetic@example.test', items(), address, 'cod', { idempotencyKey: key, ...extra });
const count = async (table: string) => { assert.ok(['orders','checkout_requests','coupon_usage','auth_tokens'].includes(table)); return Number((await read<{ count: string }>('SELECT COUNT(*) AS count FROM ' + table))[0].count); };
const stock = async () => (await read<{ stock: number }>('SELECT stock FROM products WHERE id=$1', [productId]))[0].stock;
const couponUses = async () => (await read<{ used_count: number }>("SELECT used_count FROM coupons WHERE code='TEST'"))[0].used_count;

describe('customer quote/order PostgreSQL and native React hook acceptance', { skip, concurrency: false }, () => {
  before(async () => {
    const target = new URL(databaseUrl!); assert.ok(['postgres:','postgresql:'].includes(target.protocol));
    assert.ok(['127.0.0.1','[::1]'].includes(target.hostname)); assert.equal(target.pathname, '/connect_shop_phase6_disposable'); assert.equal(target.search, '');
    const { customerConfigSchema } = require('../src/config/customerConfig') as typeof import('../src/config/customerConfig');
    const config = customerConfigSchema.parse({ STORE_CURRENCY: 'EUR', STORE_TAX_RATE: '0.2', STORE_SHIPPING_DEFAULT: '6', STORE_FREE_SHIPPING_THRESHOLD: '50', STORE_SHIPPING_BY_REGION: '{"alpha":2.75}' });
    stub('../src/config/env', { env: { ...config, NODE_ENV: 'test', DATABASE_URL: databaseUrl, DB_STATEMENT_TIMEOUT_MS: 10000, REDIS_CACHE_TIMEOUT_MS: 30,
      FRONTEND_URL: 'http://localhost:3000', SESSION_SECRET: 'synthetic-session-secret-not-used-in-production', COOKIE_MAX_AGE: 604800000, EMAIL_AUTH_ENABLED: true } });
    stub('../src/utils/logger', { logger: { info() {}, warn() {}, error() {} } }); stub('../src/utils/performance', { logSlowQuery() {} });
    db = require('../src/config/db'); setupPool = new (require('pg').Pool)(db.buildPoolConfig(databaseUrl!, { statementTimeoutMs: 0 }));
    const client = await setupPool.connect();
    try {
      assert.equal((await client.query('SELECT current_database() AS name')).rows[0].name, 'connect_shop_phase6_disposable');
      assert.equal((await client.query('SHOW transaction_isolation')).rows[0].transaction_isolation, 'read committed');
      assert.equal((await client.query("SELECT COUNT(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'")).rows[0].count, 0, 'No pre-existing customer tables allowed');
      assert.match(schema, /^phase6_acceptance_[0-9a-f]{32}$/); await client.query('CREATE SCHEMA "' + schema + '"'); await client.query('SET search_path TO "' + schema + '", public');
      await client.query(readFileSync(require.resolve('../src/db/schema.sql'), 'utf8').split('-- Phase 6 customer monetary configuration')[0]);
      await client.query("INSERT INTO orders (guest_email,status,total,shipping_address,payment_method,payment_status) VALUES ('legacy@example.test','confirmed',10,'{}','cash_on_delivery','pending')");
      const migration = readFileSync(require.resolve('../src/db/migrations/016_order_currency.sql'), 'utf8'); await client.query(migration); await client.query(migration);
      assert.equal((await client.query('SELECT currency FROM orders')).rows[0].currency, 'USD');
    } finally { client.release(); }
    const transaction: typeof db.withTransaction = work => db.withTransaction(async client => { await client.query('SET LOCAL search_path TO "' + schema + '", public'); return work(client); });
    read = (sql, values) => transaction(async client => (await client.query(sql, values)).rows);
    stub('../src/config/db', { ...db, query: read, withTransaction: transaction });
    class AppError extends Error { constructor(message: string, public statusCode: number, _op = true, public code?: string) { super(message); } }
    stub('../src/utils/errors', { AppError, NotFoundError: class extends AppError {}, ConflictError: class extends AppError {}, UnauthorizedError: class extends AppError {} });
    stub('../src/services/products.service', { invalidateProductCaches: async () => {} });
    stub('../src/services/securityEvent.service', { logCheckoutBlocked() {}, maskPhone() {} });
    stub('../src/services/email.service', { EmailService: {
      sendOrderConfirmation: async () => { throw new Error('Synthetic provider failure'); },
      sendEmailVerification: async () => { if (emailFailure) throw new Error('Synthetic provider failure'); return 'accepted'; },
      sendPasswordReset: async () => { if (emailFailure) throw new Error('Synthetic provider failure'); return 'accepted'; },
    } });
    orders = require('../src/services/orders.service'); cart = require('../src/services/cart.service'); auth = require('../src/services/auth.service');
    controller = require('../src/controllers/orders.controller');
    const { build } = require('esbuild');
    const bundle = (await build({ stdin: { contents: browserProbe, resolveDir: process.cwd() }, bundle: true, write: false,
      platform: 'browser', format: 'iife', tsconfig: require.resolve('../../frontend/tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' },
      plugins: [{ name: 'synthetic-http-api-only', setup(build: any) {
        build.onResolve({ filter: /^@\/lib\/api$/ }, () => ({ path: 'fixture-api', namespace: 'fixture' }));
        build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: fixtureApi }));
      } }] })).outputFiles[0].text;
    server = createServer(async (req, res) => {
      if (req.method === 'GET') { res.setHeader('Content-Type','text/html'); res.end('<!doctype html><div id="root"></div><script>globalThis.fixture=' + JSON.stringify({ productId, key: randomUUID() }) + '</script><script>' + bundle + '</script>'); return; }
      try {
        let raw = ''; for await (const chunk of req) raw += chunk; const body = JSON.parse(raw);
        const fakeReq = { body, user: undefined, get: () => req.headers['idempotency-key'] };
        let result: any; let failure: any; let status = 200;
        const fakeRes = { setHeader: (name: string, value: string) => res.setHeader(name,value), status(code: number) { status=code; return this; }, json(value: unknown) { result=value; } };
        if (req.url?.includes('/quote')) {
          await controller.quote(fakeReq as any, fakeRes as any, error => { failure=error; });
          if (holdQuote) await new Promise<void>(resolve => pendingQuotes.push(resolve));
        } else {
          await controller.create(fakeReq as any, fakeRes as any, error => { failure=error; });
          if (dropOrder && !failure) { res.destroy(); return; }
        }
        if (failure) { status=failure.statusCode || 500; result={ message: failure.message, code: failure.code }; }
        res.statusCode=status; res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(result));
      } catch { res.statusCode=500; res.end('{}'); }
    });
    await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve)); const bound=server.address(); assert.ok(bound && typeof bound!=='string'); origin='http://127.0.0.1:'+bound.port;
    browser = await require('../../frontend/node_modules/@playwright/test').chromium.launch({ headless:true });
  });
  after(async () => {
    pendingQuotes.splice(0).forEach(resolve => resolve()); if (browser) await browser.close();
    if (server) await new Promise<void>((resolve,reject) => server.close(error => error ? reject(error) : resolve()));
    if (!db) return;
    try { assert.match(schema,/^phase6_acceptance_[0-9a-f]{32}$/); if(setupPool) await setupPool.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE'); }
    finally { if(setupPool) await setupPool.end(); await db.pool.end(); }
  });
  beforeEach(async () => {
    holdQuote=false; dropOrder=false; emailFailure=false; pendingQuotes.splice(0).forEach(resolve=>resolve());
    const client=await setupPool.connect();
    try { await client.query('SET search_path TO "'+schema+'", public'); await client.query('DELETE FROM checkout_requests; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM coupons; DELETE FROM products; DELETE FROM users; DELETE FROM categories'); }
    finally { client.release(); }
    userId=(await read<{id:string}>("INSERT INTO users(name,email) VALUES ('Synthetic','synthetic@example.test') RETURNING id"))[0].id;
    const category=(await read<{id:number}>("INSERT INTO categories(name,slug) VALUES ('Synthetic','synthetic') RETURNING id"))[0].id;
    productId=(await read<{id:string}>("INSERT INTO products(name,slug,price,category_id,stock) VALUES ('Synthetic','synthetic',19.99,$1,10) RETURNING id",[category]))[0].id;
    variantId=(await read<{id:string}>("INSERT INTO product_variants(product_id,sku,name,price,stock) VALUES ($1,'synthetic-variant','Synthetic variant',7.25,10) RETURNING id",[productId]))[0].id;
    await read("INSERT INTO coupons(code,type,value,usage_limit) VALUES ('TEST','percent',20,5),('FIXED','fixed',100,5)");
  });
  async function page(): Promise<{ context: BrowserContext; page: Page }> { const context=await browser.newContext(); const page=await context.newPage(); await page.goto(origin); return {context,page}; }
  async function until(check: () => Promise<boolean>) { const end=Date.now()+5000; while(Date.now()<end) { if(await check())return; await new Promise(resolve=>setTimeout(resolve,20)); } assert.fail('Synthetic concurrency condition did not occur'); }
  async function held(): Promise<PoolClient> { const client=await db.pool.connect(); await client.query('BEGIN'); await client.query('SET LOCAL search_path TO "'+schema+'", public'); return client; }

  it('quotes current prices/coupon/tax/shipping and creates an identical guest COD order without quote side effects',async()=>{
    const before={stock:await stock(),uses:await couponUses(),orders:await count('orders'),claims:await count('checkout_requests')};
    const quote=await orders.quoteCheckout(null,items(),location,' test ','cod');
    assert.deepEqual(expected(quote),{subtotal:'19.99',discount_amount:'4.00',tax_amount:'3.20',shipping_cost:'2.75',total:'21.94',currency:'EUR'});
    assert.deepEqual({stock:await stock(),uses:await couponUses(),orders:await count('orders'),claims:await count('checkout_requests')},before);
    const result=await guest(randomUUID(),{couponCode:'TEST',expectedQuote:expected(quote)});
    for(const field of Object.keys(expected(quote)) as (keyof ExpectedQuote)[]) assert.equal(result.order[field],quote[field]);
    assert.equal(result.order.payment_method,'cash_on_delivery'); assert.equal(result.order.payment_status,'pending'); assert.equal(await couponUses(),1); assert.equal(await stock(),9);
  });
  it('quotes authenticated cart/variant prices and pre-discount free shipping without consuming the cart',async()=>{
    const base=await cart.addToCart(userId,productId,2); const variant=await cart.addToCart(userId,productId,2,variantId);
    const request=[{productId,quantity:2,cartItemId:base.id},{productId,variantId,quantity:2,cartItemId:variant.id}];
    const quote=await orders.quoteCheckout(userId,request,location,'TEST'); assert.equal(quote.subtotal,'54.48'); assert.equal(quote.shipping_cost,'0.00'); assert.equal(quote.discount_amount,'10.90'); assert.equal(quote.total,'52.30');
    assert.equal((await cart.getCart(userId)).itemCount,4);
    const placed=await orders.placeOrder(userId,address,'cod',{items:request,couponCode:'TEST',expectedQuote:expected(quote),idempotencyKey:randomUUID()});
    assert.equal(placed.order.total,quote.total); assert.equal(placed.order.currency,'EUR'); assert.equal((await cart.getCart(userId)).itemCount,0);
  });
  it('caps fixed discounts, taxes discounted amounts and uses configured fallback shipping',async()=>{
    const quote=await orders.quoteCheckout(null,items(),{...location,state:'Unknown'},'FIXED');
    assert.equal(quote.discount_amount,'19.99'); assert.equal(quote.tax_amount,'0.00'); assert.equal(quote.shipping_cost,'6.00'); assert.equal(quote.total,'6.00');
    await assert.rejects(guest(randomUUID(),{couponCode:'FIXED',expectedQuote:expected(quote)}), (error: any) => error.code === 'QUOTE_CHANGED');
    // Creation uses its actual location, never the quote to override shipping.
    const placed=await orders.placeGuestOrder('synthetic@example.test',items(),{...address,state:'Unknown'},'cod',{couponCode:'FIXED',expectedQuote:expected(quote),idempotencyKey:randomUUID()});
    assert.equal(placed.order.total,'6.00');
  });
  it('rejects stale displayed prices atomically and allows the same uncommitted key after a fresh quote',async()=>{
    const quote=await orders.quoteCheckout(null,items(),location); const key=randomUUID(); await read('UPDATE products SET price=20.99 WHERE id=$1',[productId]);
    await assert.rejects(guest(key,{expectedQuote:expected(quote)}),(error:any)=>error.code==='QUOTE_CHANGED'); assert.equal(await count('orders'),0); assert.equal(await count('checkout_requests'),0); assert.equal(await stock(),10);
    const current=await orders.quoteCheckout(null,items(),location); const placed=await guest(key,{expectedQuote:expected(current)}); assert.equal(placed.order.total,current.total); assert.equal(await stock(),9);
  });
  it('replays a committed order after price/quote changes without creating a new purchase',async()=>{
    const quote=await orders.quoteCheckout(null,items(),location); const key=randomUUID(); const first=await guest(key,{expectedQuote:expected(quote)});
    await read('UPDATE products SET price=30 WHERE id=$1',[productId]); const newer=await orders.quoteCheckout(null,items(),location);
    const retry=await guest(key,{expectedQuote:expected(newer)}); assert.equal(retry.replayed,true); assert.equal(retry.order.id,first.order.id); assert.equal(retry.order.total,first.order.total); assert.equal(await stock(),9); assert.equal(await count('orders'),1);
  });
  it('revalidates coupon eligibility and stock after quote without leaving partial orders or claims',async()=>{
    const quote=await orders.quoteCheckout(null,items(),location,'TEST'); await read("UPDATE coupons SET used_count=usage_limit WHERE code='TEST'");
    await assert.rejects(guest(randomUUID(),{couponCode:'TEST',expectedQuote:expected(quote)})); assert.equal(await count('orders'),0); assert.equal(await stock(),10);
    await read('UPDATE products SET stock=0 WHERE id=$1',[productId]); await assert.rejects(orders.quoteCheckout(null,items(),location)); await assert.rejects(guest(randomUUID(),{expectedQuote:expected(quote)})); assert.equal(await count('checkout_requests'),0);
  });
  it('rejects retired variants and malformed preconditions without granting quote authority',async()=>{
    await read('UPDATE product_variants SET is_active=false WHERE id=$1',[variantId]); await assert.rejects(orders.quoteCheckout(null,[{productId,variantId,quantity:1}],location));
    await assert.rejects(guest(randomUUID(),{expectedQuote:{subtotal:'1',total:'0.00',currency:'EUR'}})); assert.equal(await count('orders'),0);
    // An old client without a precondition still pays server-calculated amounts.
    assert.equal((await guest(randomUUID())).order.total,'26.74');
  });
  it('detects a changed authenticated snapshot even while an actual cart writer is queued',async()=>{
    const row=await cart.addToCart(userId,productId,1); const client=await held(); let write: Promise<unknown> | undefined; let quote: Promise<unknown> | undefined;
    try {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['cart:'+userId]);
      write=cart.addToCart(userId,productId,1);
      await until(async()=>Number((await read<{n:string}>("SELECT COUNT(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'"))[0].n)>=1);
      quote=orders.quoteCheckout(userId,[{productId,quantity:1,cartItemId:row.id}],location); const outcome=quote.catch(error=>error);
      await until(async()=>Number((await read<{n:string}>("SELECT COUNT(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory'"))[0].n)>=2);
      await client.query('COMMIT'); await write; assert.equal((await outcome as any).code,'CART_CHANGED'); assert.equal((await cart.getCart(userId)).itemCount,2); assert.equal(await stock(),10);
    } finally { await client.query('ROLLBACK'); client.release(); if(write)await write; if(quote)await quote.catch(()=>{}); }
  });
  it('checks stock after waiting for a real inventory row lock',async()=>{
    const client=await held(); let operation: Promise<unknown> | undefined;
    try { await client.query('SELECT stock FROM products WHERE id=$1 FOR UPDATE',[productId]); operation=orders.quoteCheckout(null,items(2),location); const outcome=operation.catch(error=>error);
      await until(async()=>Number((await read<{n:string}>("SELECT COUNT(*) AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM products p%'"))[0].n)>=1);
      await client.query('UPDATE products SET stock=1 WHERE id=$1',[productId]); await client.query('COMMIT'); assert.match((await outcome as any).message,/Insufficient stock/); assert.equal(await count('orders'),0);
    } finally {await client.query('ROLLBACK');client.release();if(operation)await operation.catch(()=>{});}
  });
  it('preserves a created account when verification email fails and returns an explicit delivery status',async()=>{
    emailFailure=true; const user=await auth.registerWithPassword({name:'Synthetic registration',email:'registration@example.test',password:'synthetic-password-only'});
    assert.equal(user.emailDeliveryStatus,'failed'); assert.equal((await read<{n:string}>('SELECT COUNT(*) AS n FROM users WHERE id=$1',[user.id]))[0].n,'1'); assert.equal(await count('auth_tokens'),1);
  });
  it('returns private no-store quotes with no personal delivery fields or provider calls',async()=>{
    const fixture=await page();
    try { const response=await fixture.page.request.post(origin+'/api/orders/quote',{data:{items:items(),shippingAddress:location,couponCode:'TEST'}});
      assert.equal(response.headers()['cache-control'],'private, no-store'); const body=await response.json(); assert.equal(body.quote.total,'21.94'); assert.doesNotMatch(JSON.stringify(body),/fullName|phone|guestEmail|addressLine1|Synthetic Customer/); assert.equal(await count('orders'),0);
    }finally{await fixture.context.close();}
  });
  it('native React quote hook cancels outdated reads and never exposes their totals or enables submission',async()=>{
    const fixture=await page();
    try {
      await fixture.page.waitForFunction(()=>!(globalThis as any).document.querySelector('#submit').disabled);
      assert.equal(await fixture.page.locator('#total').textContent(),'26.74');
      holdQuote=true; await fixture.page.locator('#coupon').fill('TEST'); await until(async()=>pendingQuotes.length>=1);
      assert.equal(await fixture.page.locator('#total').textContent(),'—'); assert.equal(await fixture.page.locator('#submit').isDisabled(),true);
      await fixture.page.locator('#coupon').fill('INVALID'); await until(async()=>pendingQuotes.length>=2);
      holdQuote=false; pendingQuotes.splice(0).forEach(resolve=>resolve()); await fixture.page.waitForFunction(()=>Boolean((globalThis as any).document.querySelector('#error').textContent));
      assert.equal(await fixture.page.locator('#total').textContent(),'—'); assert.equal(await fixture.page.locator('#submit').isDisabled(),true);
      await fixture.page.locator('#coupon').fill('TEST'); await fixture.page.waitForFunction(()=>!(globalThis as any).document.querySelector('#submit').disabled);
      assert.equal(await fixture.page.locator('#total').textContent(),'21.94');
    }finally{holdQuote=false;pendingQuotes.splice(0).forEach(resolve=>resolve());await fixture.context.close();}
  });
  it('native quote/order flow requires fresh totals after a price change and keeps committed orders successful when email fails',async()=>{
    const fixture=await page();
    try {await fixture.page.waitForFunction(()=>!(globalThis as any).document.querySelector('#submit').disabled);
      await read('UPDATE products SET price=20.99 WHERE id=$1',[productId]); await fixture.page.locator('#submit').click();
      await fixture.page.waitForFunction(()=> (globalThis as any).document.querySelector('#order-error').textContent.includes('QUOTE_CHANGED'));
      assert.equal(await count('orders'),0); await fixture.page.waitForFunction(()=>!(globalThis as any).document.querySelector('#submit').disabled);
      assert.equal(await fixture.page.locator('#total').textContent(),'27.94'); await fixture.page.locator('#submit').click(); await fixture.page.waitForFunction(()=>Boolean((globalThis as any).document.querySelector('#order-id').textContent));
      assert.equal(await count('orders'),1); assert.equal(await stock(),9);
    }finally{await fixture.context.close();}
  });
  it('native response-loss retry with a refreshed quote reuses the checkout key and returns the committed receipt',async()=>{
    const fixture=await page();
    try {await fixture.page.waitForFunction(()=>!(globalThis as any).document.querySelector('#submit').disabled); dropOrder=true; await fixture.page.locator('#submit').click();
      await fixture.page.waitForFunction(()=>Boolean((globalThis as any).document.querySelector('#order-error').textContent)); assert.equal(await count('orders'),1);
      await read('UPDATE products SET price=30 WHERE id=$1',[productId]); dropOrder=false; await fixture.page.locator('#retry-quote').click(); await fixture.page.waitForFunction(()=>!(globalThis as any).document.querySelector('#submit').disabled);
      await fixture.page.locator('#submit').click(); await fixture.page.waitForFunction(()=>Boolean((globalThis as any).document.querySelector('#order-id').textContent));
      assert.equal(await count('orders'),1); assert.equal(await stock(),9); assert.equal(await fixture.page.locator('#order-replayed').textContent(),'true');
    }finally{dropOrder=false;await fixture.context.close();}
  });
});

// Actual production hook + checkout-attempt identity. Only its HTTP transport is
// adapted to the loopback fixture; React/AbortSignal and transactions are real.
const browserProbe = `
import React,{useState,useRef} from '../frontend/node_modules/react';
import {createRoot} from '../frontend/node_modules/react-dom/client';
import {useCheckoutQuote} from '../frontend/src/hooks/useCheckoutQuote';
import {expectedQuote} from '../frontend/src/lib/checkout-quote';
import {prepareCheckoutAttempt} from '../frontend/src/lib/checkout-attempt';
import {api} from '@/lib/api';
function Probe(){const[coupon,setCoupon]=useState('');const[order,setOrder]=useState(null);const[error,setError]=useState('');const attempt=useRef(null);
const items=[{productId:globalThis.fixture.productId,variantId:null,quantity:1}];
const quote=useCheckoutQuote({items,shippingAddress:{city:'Alpha',state:'Alpha',country:'Synthetic Country'},couponCode:coupon||undefined,paymentMethod:'cash_on_delivery'},'guest',!order);
async function submit(){if(!quote.quote)return;setError('');const request={items,guestEmail:'synthetic@example.test',shippingAddress:{fullName:'Synthetic Customer',phone:'0000000000',addressLine1:'Synthetic Address',city:'Alpha',state:'Alpha',country:'Synthetic Country'},couponCode:coupon||undefined,paymentMethod:'cash_on_delivery',expectedQuote:expectedQuote(quote.quote)};
attempt.current=await prepareCheckoutAttempt('guest',request,attempt.current);try{const result=await api.post('/api/orders',request,{headers:{'Idempotency-Key':attempt.current.key}});setOrder(result);}catch(error){setError(error.code||error.message);if(error.code==='QUOTE_CHANGED')quote.retry();}}
return React.createElement('div',null,React.createElement('input',{id:'coupon',value:coupon,onChange:event=>setCoupon(event.target.value)}),React.createElement('span',{id:'total'},quote.quote?.total||'—'),React.createElement('span',{id:'error'},quote.error),React.createElement('button',{id:'submit',disabled:!quote.quote||quote.loading,onClick:submit},'Order'),React.createElement('button',{id:'retry-quote',onClick:quote.retry},'Retry quote'),React.createElement('span',{id:'order-error'},error),React.createElement('span',{id:'order-id'},order?.order.id||''),React.createElement('span',{id:'order-replayed'},String(order?.replayed||false)));}
createRoot(document.getElementById('root')).render(React.createElement(Probe));
`;
const fixtureApi = `
export class ApiError extends Error{constructor(status,message,code){super(message);this.status=status;this.code=code;}}
export const getErrorMessage=(error,fallback)=>error.message||fallback;
export const api={post:async(endpoint,body,options={})=>{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...options.headers},body:JSON.stringify(body),signal:options.signal});const result=await response.json();if(!response.ok)throw new ApiError(response.status,result.message,result.code);return result;}};
`;
