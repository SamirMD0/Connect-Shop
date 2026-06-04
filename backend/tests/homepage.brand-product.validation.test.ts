import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import type { Request } from 'express';
import { validationResult, type ValidationChain } from 'express-validator';

process.env.NODE_ENV = 'test';
delete process.env.REDIS_URL;

after(async () => {
  const { pool } = await import('../src/config/db');
  const { redisClient } = await import('../src/config/redis');
  if (redisClient) {
    redisClient.disconnect();
  }
  await pool.end();
});

async function runValidation(
  rules: ValidationChain[],
  body: Record<string, unknown>,
  params: Record<string, unknown> = {}
): Promise<Array<{ field: string; message: string }>> {
  const req = { body, params } as Request;

  for (const rule of rules) {
    await rule.run(req);
  }

  return validationResult(req).array().map((error) => ({
    field: 'path' in error ? error.path : 'unknown',
    message: String(error.msg),
  }));
}

describe('homepage brand product section validation', () => {
  it('accepts controlled create input', async () => {
    const { homepageBrandProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBrandProductSectionCreateRules, {
      title: 'Samsung picks',
      subtitle: 'Latest Samsung products',
      brand_id: 1,
      product_limit: 8,
      sort_key: 'newest',
      layout: 'grid',
      is_active: true,
    });

    assert.deepEqual(errors, []);
  });

  it('rejects missing required create fields', async () => {
    const { homepageBrandProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBrandProductSectionCreateRules, {
      product_limit: 8,
      sort_key: 'newest',
      layout: 'grid',
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('title'));
    assert.ok(fields.includes('brand_id'));
  });

  it('rejects invalid controlled values', async () => {
    const { homepageBrandProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBrandProductSectionCreateRules, {
      title: 'Invalid section',
      brand_id: 1,
      product_limit: 20,
      sort_key: 'random()',
      layout: 'custom',
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('product_limit'));
    assert.ok(fields.includes('sort_key'));
    assert.ok(fields.includes('layout'));
  });

  it('rejects raw ordering, URL, and metadata fields', async () => {
    const { homepageBrandProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBrandProductSectionCreateRules, {
      title: 'Unsafe section',
      brand_id: 1,
      product_limit: 8,
      sort_key: 'newest',
      layout: 'rail',
      display_order: 99,
      link_url: '/store',
      metadata: { raw: true },
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('display_order'));
    assert.ok(fields.includes('link_url'));
    assert.ok(fields.includes('metadata'));
  });

  it('allows controlled partial update and rejects manual display order', async () => {
    const { homepageBrandProductSectionUpdateRules } = await import('../src/middleware/validate');

    const validErrors = await runValidation(
      homepageBrandProductSectionUpdateRules,
      { title: 'Updated title', is_active: false },
      { id: '11111111-1111-4111-8111-111111111111' }
    );

    assert.deepEqual(validErrors, []);

    const invalidErrors = await runValidation(
      homepageBrandProductSectionUpdateRules,
      { display_order: 2 },
      { id: '11111111-1111-4111-8111-111111111111' }
    );

    assert.ok(invalidErrors.some((error) => error.field === 'display_order'));
  });
});

describe('homepage category product section validation', () => {
  it('accepts controlled create input', async () => {
    const { homepageCategoryProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageCategoryProductSectionCreateRules, {
      title: 'Latest smartphones',
      subtitle: 'Fresh products from this category',
      category_id: 1,
      product_limit: 8,
      sort_key: 'newest',
      layout: 'rail',
      is_active: true,
    });

    assert.deepEqual(errors, []);
  });

  it('rejects missing required create fields', async () => {
    const { homepageCategoryProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageCategoryProductSectionCreateRules, {
      product_limit: 8,
      sort_key: 'newest',
      layout: 'grid',
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('title'));
    assert.ok(fields.includes('category_id'));
  });

  it('rejects invalid controlled values and forbidden raw fields', async () => {
    const { homepageCategoryProductSectionCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageCategoryProductSectionCreateRules, {
      title: 'Invalid category section',
      category_id: 1,
      product_limit: 20,
      sort_key: 'random()',
      layout: 'custom',
      display_order: 10,
      link_url: '/store',
      metadata: { raw: true },
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('product_limit'));
    assert.ok(fields.includes('sort_key'));
    assert.ok(fields.includes('layout'));
    assert.ok(fields.includes('display_order'));
    assert.ok(fields.includes('link_url'));
    assert.ok(fields.includes('metadata'));
  });
});
