import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Request, Response, NextFunction } from 'express';

process.env.NODE_ENV = 'test';
delete process.env.REDIS_URL;

function createJsonResponse() {
  let statusCode = 200;
  let body: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as Partial<Response> as Response;

  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
}

describe('public homepage aggregate endpoint', () => {
  it('route exposes GET /full before the legacy homepage route', async () => {
    const routesSource = await readFile(join(process.cwd(), 'src/routes/homepage.routes.ts'), 'utf8');
    const fullRouteIndex = routesSource.indexOf("router.get('/full', getPublicHomepageFull)");
    const legacyRouteIndex = routesSource.indexOf("router.get('/', getPublicHomepage)");

    assert.notEqual(fullRouteIndex, -1);
    assert.notEqual(legacyRouteIndex, -1);
    assert.ok(fullRouteIndex < legacyRouteIndex);
    assert.doesNotMatch(routesSource, /router\.(post|patch|put|delete)\('\/full'/);
  });

  it('returns public aggregate data with expected keys', async () => {
    const { getPublicHomepageFull } = await import('../src/controllers/homepage.controller');
    const response = createJsonResponse();
    let nextError: unknown;
    const next: NextFunction = (error?: unknown) => {
      nextError = error;
    };

    await getPublicHomepageFull({} as Request, response.res, next);

    assert.equal(nextError, undefined);
    assert.equal(response.statusCode, 200);
    assert.ok(response.body && typeof response.body === 'object');

    const payload = response.body as {
      success?: boolean;
      data?: Record<string, unknown>;
      partialFailures?: unknown;
    };

    assert.equal(payload.success, true);
    assert.ok(payload.data);
    assert.ok(Array.isArray(payload.data.featuredProducts));
    assert.ok(Array.isArray(payload.data.trendingProducts));
    assert.ok(Array.isArray(payload.data.categories));
    assert.ok(Array.isArray(payload.data.brands));
    assert.ok(Array.isArray(payload.data.carouselSlides));
    assert.ok(payload.data.homepage && typeof payload.data.homepage === 'object');
    assert.ok(Array.isArray(payload.partialFailures));
  });

  it('does not expose private checkout, auth, or admin data', async () => {
    const { getPublicHomepageFull } = await import('../src/controllers/homepage.controller');
    const response = createJsonResponse();

    await getPublicHomepageFull({} as Request, response.res, () => undefined);

    const serialized = JSON.stringify(response.body).toLowerCase();
    assert.doesNotMatch(serialized, /password|session|token|csrf|cookie|order_id|payment|admin_role/);
  });
});
