import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StorefrontUnavailable } from '../../src/components/ui/StorefrontUnavailable';
import { CountdownPromo } from '../../src/components/home/CountdownPromo';
import type { HomepageSectionItem } from '../../src/lib/types';
import { api, ApiError } from '../../src/lib/api';
import { homepageCatalogUnavailable, isPublicStorefrontRead, PublicReadTimeoutError,
  publicReadTimeoutMs, withPublicReadDeadline } from '../../src/lib/public-read';

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const never = () => new Promise<never>(() => {});
const jsonResponse = (body: unknown = { success: true }, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json' },
});

describe('public storefront read deadlines', () => {
  const originalFetch = globalThis.fetch;
  const originalDeadline = process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS;
  beforeEach(() => { process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS = '15'; });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalDeadline === undefined) delete process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS;
    else process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS = originalDeadline;
  });

  it('limits only public catalog GET/HEAD families', () => {
    for (const path of ['/api/v1/products', '/api/v1/products/fixture', '/api/v1/products/fixture/questions',
      '/api/v1/products/featured', '/api/v1/products/categories', '/api/v1/categories', '/api/v1/brands',
      '/api/v1/carousel', '/api/v1/homepage', '/api/v1/homepage/full']) {
      for (const method of ['GET', 'HEAD']) assert.equal(isPublicStorefrontRead(path, method), true);
      for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.equal(isPublicStorefrontRead(path, method), false);
    }
    for (const path of ['/api/v1/auth/me', '/api/v1/admin/products', '/api/v1/cart', '/api/v1/checkout', '/api/v1/orders', '/api/v1/products-other',
      '/api/v1/carousel/admin', '/api/v1/homepage/admin', '/api/v1/products/fixture/private-status']) {
      assert.equal(isPublicStorefrontRead(path, 'GET'), false);
    }
  });

  it('uses finite defaults and caps excessive configuration', () => {
    for (const input of ['', ' ', 'NaN', 'Infinity', '0', '-1']) {
      process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS = input;
      assert.equal(publicReadTimeoutMs(), 5000);
    }
    process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS = '45000';
    assert.equal(publicReadTimeoutMs(), 30000);
    process.env.NEXT_PUBLIC_STOREFRONT_READ_TIMEOUT_MS = '123';
    assert.equal(publicReadTimeoutMs(), 123);
  });

  it('rejects a stuck fetch and aborts the underlying signal with no retry', async () => {
    let signal: AbortSignal | null | undefined; let calls = 0;
    globalThis.fetch = async (_url, options) => { calls++; signal = options?.signal; return never(); };
    await assert.rejects(api.get('/api/homepage/full'), PublicReadTimeoutError);
    assert.equal(signal?.aborted, true); assert.equal(calls, 1);
  });

  it('also bounds response-body consumption', async () => {
    let signal: AbortSignal | null | undefined;
    globalThis.fetch = async (_url, options) => {
      signal = options?.signal;
      const response = jsonResponse(); response.json = never; return response;
    };
    await assert.rejects(api.get('/api/products'), PublicReadTimeoutError);
    assert.equal(signal?.aborted, true);
  });

  it('preserves caller cancellation, including a signal aborted before the request', async () => {
    const caller = new AbortController(); const reason = new Error('caller canceled');
    let underlying: AbortSignal | undefined;
    const pending = withPublicReadDeadline((signal) => { underlying = signal; return never(); }, caller.signal, 100);
    caller.abort(reason);
    await assert.rejects(pending, (error: unknown) => error === reason);
    assert.equal(underlying?.aborted, true);
    let invoked = false;
    await assert.rejects(withPublicReadDeadline(async () => { invoked = true; }, caller.signal), (error: unknown) => error === reason);
    assert.equal(invoked, false);
  });

  it('returns actual data and preserves API errors and caller signals on success', async () => {
    let signal: AbortSignal | null | undefined;
    globalThis.fetch = async (_url, options) => { signal = options?.signal; return jsonResponse(); };
    assert.deepEqual(await api.get('/api/products'), { success: true });
    await pause(25); assert.equal(signal?.aborted, false);
    globalThis.fetch = async () => jsonResponse({ success: false }, 404);
    await assert.rejects(api.get('/api/products/missing'), (error: unknown) => error instanceof ApiError && error.status === 404);
  });

  it('does not apply the catalog deadline or retries to auth, checkout or writes', async () => {
    let calls = 0; const caller = new AbortController();
    globalThis.fetch = async (_url, options) => {
      calls++; assert.equal(options?.signal, caller.signal);
      await pause(25); return jsonResponse();
    };
    await api.get('/api/auth/me', { signal: caller.signal });
    await api.get('/api/carousel/admin', { signal: caller.signal });
    await api.get('/api/orders', { signal: caller.signal });
    await api.get('/api/checkout', { signal: caller.signal });
    await api.post('/api/orders', {}, { signal: caller.signal, headers: { 'X-CSRF-Token': 'synthetic' } });
    await api.patch('/api/products/fixture', {}, { signal: caller.signal, headers: { 'X-CSRF-Token': 'synthetic' } });
    assert.equal(calls, 6); assert.equal(caller.signal.aborted, false);
  });

  it('server-renders a clear retry state without prices, stock or fabricated products', () => {
    const html = renderToStaticMarkup(createElement(StorefrontUnavailable));
    assert.match(html, /Catalog temporarily unavailable/);
    assert.match(html, /<button[^>]*>Retry<\/button>/);
    assert.doesNotMatch(html, /InStock|priceCurrency|\$|product-card/);
  });

  it('omits unavailable promotions and does not invent a product for missing CMS fields', () => {
    assert.equal(renderToStaticMarkup(createElement(CountdownPromo, { promo: null })), '');
    const promo = { id: 'synthetic', title: 'Synthetic promotion', metadata: {} } as HomepageSectionItem;
    const html = renderToStaticMarkup(createElement(CountdownPromo, { promo }));
    assert.match(html, /Synthetic promotion/);
    assert.doesNotMatch(html, /iPhone|countdown-01|Enhance Your Music/);
  });

  it('distinguishes essential failures from optional failures and valid empty catalogs', () => {
    assert.equal(homepageCatalogUnavailable([]), false);
    assert.equal(homepageCatalogUnavailable(['homepage', 'brands', 'carouselSlides']), false);
    for (const section of ['featuredProducts', 'trendingProducts', 'categories']) assert.equal(homepageCatalogUnavailable([section]), true);
  });
});
