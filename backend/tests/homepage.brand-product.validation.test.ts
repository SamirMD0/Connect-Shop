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

describe('homepage block validation', () => {
  it('accepts controlled fixed block create input', async () => {
    const { homepageBlockCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBlockCreateRules, {
      block_type: 'new_arrivals',
      is_active: true,
    });

    assert.deepEqual(errors, []);
  });

  it('accepts controlled dynamic block references', async () => {
    const { homepageBlockCreateRules } = await import('../src/middleware/validate');

    const brandErrors = await runValidation(homepageBlockCreateRules, {
      block_type: 'brand_product_section',
      brand_product_section_id: '11111111-1111-4111-8111-111111111111',
    });
    const categoryErrors = await runValidation(homepageBlockCreateRules, {
      block_type: 'category_product_section',
      category_product_section_id: '22222222-2222-4222-8222-222222222222',
    });
    const promotionErrors = await runValidation(homepageBlockCreateRules, {
      block_type: 'promotion_banner',
      promotion_id: 1,
    });

    assert.deepEqual(brandErrors, []);
    assert.deepEqual(categoryErrors, []);
    assert.deepEqual(promotionErrors, []);
  });

  it('rejects invalid block type and malformed references', async () => {
    const { homepageBlockCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBlockCreateRules, {
      block_type: 'custom_html',
      brand_product_section_id: 'not-a-uuid',
      category_product_section_id: 'not-a-uuid',
      promotion_id: 0,
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('block_type'));
    assert.ok(fields.includes('brand_product_section_id'));
    assert.ok(fields.includes('category_product_section_id'));
    assert.ok(fields.includes('promotion_id'));
  });

  it('rejects manual order, raw URL, and metadata fields', async () => {
    const { homepageBlockCreateRules } = await import('../src/middleware/validate');

    const errors = await runValidation(homepageBlockCreateRules, {
      block_type: 'best_sellers',
      display_order: 9,
      link_url: '/store',
      raw_url: 'https://example.com',
      metadata: { raw: true },
    });
    const fields = errors.map((error) => error.field);

    assert.ok(fields.includes('display_order'));
    assert.ok(fields.includes('link_url'));
    assert.ok(fields.includes('raw_url'));
    assert.ok(fields.includes('metadata'));
  });

  it('allows active state updates and rejects manual display order on update', async () => {
    const { homepageBlockUpdateRules } = await import('../src/middleware/validate');

    const validErrors = await runValidation(
      homepageBlockUpdateRules,
      { is_active: false },
      { id: '33333333-3333-4333-8333-333333333333' }
    );
    const invalidErrors = await runValidation(
      homepageBlockUpdateRules,
      { display_order: 2 },
      { id: '33333333-3333-4333-8333-333333333333' }
    );

    assert.deepEqual(validErrors, []);
    assert.ok(invalidErrors.some((error) => error.field === 'display_order'));
  });
});

describe('homepage block service hardening', () => {
  it('rejects fixed blocks with irrelevant reference IDs before writing', async () => {
    const { createHomepageBlock } = await import('../src/services/homepage.service');

    await assert.rejects(
      () => createHomepageBlock({
        block_type: 'new_arrivals',
        brand_product_section_id: '11111111-1111-4111-8111-111111111111',
      }),
      /Fixed homepage blocks cannot include reference IDs/
    );
  });

  it('rejects dynamic blocks missing required reference IDs before writing', async () => {
    const { createHomepageBlock } = await import('../src/services/homepage.service');

    await assert.rejects(
      () => createHomepageBlock({ block_type: 'brand_product_section' }),
      /brand_product_section_id is required/
    );
    await assert.rejects(
      () => createHomepageBlock({ block_type: 'category_product_section' }),
      /category_product_section_id is required/
    );
    await assert.rejects(
      () => createHomepageBlock({ block_type: 'promotion_banner' }),
      /promotion_id is required/
    );
  });

  it('rejects dynamic blocks with irrelevant reference IDs before writing', async () => {
    const { createHomepageBlock } = await import('../src/services/homepage.service');

    await assert.rejects(
      () => createHomepageBlock({
        block_type: 'promotion_banner',
        promotion_id: 1,
        brand_product_section_id: '11111111-1111-4111-8111-111111111111',
      }),
      /Promotion banner blocks cannot include brand or category section references/
    );
  });

  it('rejects raw homepage block fields before writing', async () => {
    const { createHomepageBlock } = await import('../src/services/homepage.service');

    await assert.rejects(
      () => createHomepageBlock({
        block_type: 'new_arrivals',
        display_order: 1,
      }),
      /display_order is not supported/
    );
    await assert.rejects(
      () => createHomepageBlock({
        block_type: 'new_arrivals',
        metadata: { raw: true },
      }),
      /metadata is not supported/
    );
  });
});
