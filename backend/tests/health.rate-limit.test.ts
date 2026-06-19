import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('health check rate-limit placement', () => {
  it('/api/health is mounted before the general limiter', async () => {
    const appSource = await readFile(join(process.cwd(), 'src/app.ts'), 'utf8');
    const healthRouteIndex = appSource.indexOf("app.get('/api/health'");
    const generalLimiterIndex = appSource.indexOf('app.use(generalLimiter)');

    assert.notEqual(healthRouteIndex, -1);
    assert.notEqual(generalLimiterIndex, -1);
    assert.ok(healthRouteIndex < generalLimiterIndex);
  });

  it('general and public read limiters remain mounted for normal API traffic', async () => {
    const appSource = await readFile(join(process.cwd(), 'src/app.ts'), 'utf8');
    const generalLimiterIndex = appSource.indexOf('app.use(generalLimiter)');
    const productsRouteIndex = appSource.indexOf("app.use('/api/v1/products', publicReadLimiter, productsRoutes)");
    const authRouteIndex = appSource.indexOf("app.use('/api/v1/auth', authRoutes)");
    const notFoundIndex = appSource.indexOf('app.use((_req, res)');

    assert.notEqual(generalLimiterIndex, -1);
    assert.notEqual(productsRouteIndex, -1);
    assert.notEqual(authRouteIndex, -1);
    assert.notEqual(notFoundIndex, -1);
    assert.ok(generalLimiterIndex < productsRouteIndex);
    assert.ok(generalLimiterIndex < authRouteIndex);
    assert.ok(generalLimiterIndex < notFoundIndex);
  });

  it('/api/health returns only basic non-sensitive fields', async () => {
    const appSource = await readFile(join(process.cwd(), 'src/app.ts'), 'utf8');
    const healthBlock = appSource.slice(
      appSource.indexOf("app.get('/api/health'"),
      appSource.indexOf('app.use(generalLimiter)')
    );

    assert.match(healthBlock, /success:\s*true/);
    assert.match(healthBlock, /message:\s*'ElecSHOP API is running'/);
    assert.match(healthBlock, /timestamp:\s*new Date\(\)\.toISOString\(\)/);
    assert.match(healthBlock, /environment:\s*env\.NODE_ENV/);
    assert.doesNotMatch(healthBlock.toLowerCase(), /database|redis|password|secret|token|url/);
  });
});
