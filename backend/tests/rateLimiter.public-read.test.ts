import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { Request } from 'express';
import {
  getPublicReadRouteFamily,
  hasValidInternalSsrSecretValue,
  isPublicReadRequest,
} from '../src/middleware/publicReadRoutes';

function req(method: string, originalUrl: string): Pick<Request, 'method' | 'path' | 'originalUrl' | 'baseUrl'> {
  return {
    method,
    originalUrl,
    path: originalUrl.split('?')[0],
    baseUrl: '',
  };
}

async function rateLimiterSource(): Promise<string> {
  return readFile(join(process.cwd(), 'src', 'middleware', 'rateLimiter.ts'), 'utf8');
}

function sourceSection(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);

  return source.slice(start, end);
}

describe('isPublicReadRequest', () => {
  const publicReadCases = [
    ['GET', '/api/v1/products', 'product_list'],
    ['HEAD', '/api/v1/products', 'product_list'],
    ['GET', '/api/v1/products/some-slug', 'product_detail'],
    ['GET', '/api/v1/products/some-slug/questions', 'product_detail'],
    ['GET', '/api/v1/products/categories', 'metadata'],
    ['GET', '/api/v1/categories', 'metadata'],
    ['GET', '/api/v1/categories/laptops', 'metadata'],
    ['GET', '/api/v1/brands', 'metadata'],
    ['GET', '/api/v1/brands/apple', 'metadata'],
    ['GET', '/api/v1/carousel', 'metadata'],
    ['GET', '/api/v1/homepage', 'homepage'],
    ['GET', '/api/v1/homepage/full', 'homepage'],
    ['GET', '/api/v1/homepage/preview-safe-public', 'fallback'],
    ['GET', '/api/v1/products?page=1&limit=12&category=acs', 'product_list'],
  ];

  for (const [method, path, family] of publicReadCases) {
    it(`${method} ${path} is public read in ${family} bucket`, () => {
      assert.equal(isPublicReadRequest(req(method, path)), true);
      assert.equal(getPublicReadRouteFamily(req(method, path)), family);
    });
  }

  const nonPublicReadCases = [
    ['POST', '/api/v1/products'],
    ['PATCH', '/api/v1/products/123'],
    ['GET', '/api/v1/admin'],
    ['GET', '/api/v1/admin/products'],
    ['GET', '/api/v1/cart'],
    ['GET', '/api/health'],
    ['POST', '/api/v1/cart'],
    ['POST', '/api/v1/orders'],
    ['POST', '/api/v1/auth/login'],
    ['POST', '/api/v1/homepage/full'],
    ['GET', '/api/v1/admin/homepage'],
    ['PATCH', '/api/v1/admin/homepage/blocks/123'],
    ['GET', '/api/v1/unknown'],
    ['GET', '/api/v1/users/me'],
    ['GET', '/api/v1/carousel/admin'],
    ['POST', '/api/v1/reviews'],
    ['GET', '/api/v1/users/me'],
    ['GET', '/api/v1/orders'],
    ['GET', '/api/v1/auth/me'],
    ['GET', '/api/v1/admin/uploads/image'],
  ];

  for (const [method, path] of nonPublicReadCases) {
    it(`${method} ${path} is not public read`, () => {
      assert.equal(isPublicReadRequest(req(method, path)), false);
      assert.equal(getPublicReadRouteFamily(req(method, path)), null);
    });
  }
});

describe('internal SSR public-read secret validation', () => {
  it('valid SSR secret is accepted', () => {
    assert.equal(hasValidInternalSsrSecretValue('local-secret-value', 'local-secret-value'), true);
  });

  it('missing SSR secret is rejected', () => {
    assert.equal(hasValidInternalSsrSecretValue(undefined, 'local-secret-value'), false);
    assert.equal(hasValidInternalSsrSecretValue('local-secret-value', undefined), false);
  });

  it('invalid SSR secret is rejected', () => {
    assert.equal(hasValidInternalSsrSecretValue('browser-provided-value', 'local-secret-value'), false);
  });
});

describe('rate limiter Redis failure policy', () => {
  it('public read and general limiters fail open on Redis store errors', async () => {
    const source = await rateLimiterSource();

    const generalLimiterSection = sourceSection(source, 'export const generalLimiter = rateLimit({', '/**\n * Public storefront read limiters');
    assert.match(generalLimiterSection, /createRedisStore\('rl:general:', 'general', 'fail-open'\)/);
    assert.match(generalLimiterSection, /passOnStoreError:\s*true/);

    const publicReadLimiterFactorySection = sourceSection(source, 'function createPublicReadLimiter', 'const publicReadHomepageLimiter');
    assert.match(publicReadLimiterFactorySection, /createRedisStore\(prefix, name, 'fail-open'\)/);
    assert.match(publicReadLimiterFactorySection, /passOnStoreError:\s*true/);
  });

  it('auth, admin, and identity mutation limiters fail closed on Redis store errors', async () => {
    const source = await rateLimiterSource();

    const identityLimiterSection = sourceSection(source, 'function createIdentityLimiter', '/**\n * General rate limiter');
    assert.match(identityLimiterSection, /const failurePolicy = rateLimitStoreFailurePolicy \?\? 'fail-closed'/);
    assert.match(identityLimiterSection, /passOnStoreError:\s*failurePolicy === 'fail-open'/);

    const authLimiterSection = sourceSection(source, 'export const authLimiter = rateLimit({', '/**\n * Identity-aware limiter for checkout');
    assert.match(authLimiterSection, /createRedisStore\('rl:auth:', 'auth', 'fail-closed'\)/);
    assert.match(authLimiterSection, /passOnStoreError:\s*false/);

    const adminReadLimiterSection = sourceSection(source, 'export const adminReadLimiter = rateLimit({', '/**\n * Strict identity-aware limiter');
    assert.match(adminReadLimiterSection, /createRedisStore\('rl:admin-read:', 'admin-read', 'fail-closed'\)/);
    assert.match(adminReadLimiterSection, /passOnStoreError:\s*false/);
  });

  it('Redis store failures include limiter policy and quota classification logging', async () => {
    const source = await rateLimiterSource();

    assert.match(source, /rateLimitFailurePolicy:\s*failurePolicy/);
    assert.match(source, /redisFailureKind:\s*classifyRedisStoreError\(error\)/);
    assert.match(source, /max requests limit exceeded/);
    assert.match(source, /request will be allowed by limiter fail-open policy/);
    assert.match(source, /request will be blocked by limiter fail-closed policy/);
  });
});
