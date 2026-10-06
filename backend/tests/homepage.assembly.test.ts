import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

// Exercise the actual controller + CMS assembly with synthetic, in-process dependencies.
// Unknown queries and writes fail closed; this suite never imports the real DB config.
function stub(path: string, exports: unknown) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
let counts: Record<string, number>; let failRead = ''; let hangRead = '';
let blocks: Array<Record<string, unknown>>; let sections: Array<Record<string, unknown>>;
let items: Array<Record<string, unknown>>; let cacheWrites: unknown[][];
let cachedAggregate: unknown = null;
const fixtures = {
  featured: [{ id: 'featured', price: 31, stock: 3 }],
  trending: [{ id: 'trending', price: 42, stock: 2 }],
  newest: [{ id: 'newest', price: 53, stock: 1 }],
  categories: [{ id: 1, name: 'Synthetic category' }],
  brands: [{ id: 1, is_active: true }, { id: 2, is_active: false }],
};
async function read(key: keyof typeof fixtures) {
  counts[key] = (counts[key] || 0) + 1;
  if (failRead === key) throw new Error('synthetic read failure');
  if (hangRead === key) return new Promise<never>(() => {});
  return fixtures[key];
}
stub('../src/config/db', {
  query: async (sql: string) => {
    assert.match(sql.trim(), /^SELECT/);
    if (sql.includes('FROM homepage_blocks')) return blocks;
    if (sql.includes('FROM homepage_section_items')) return items;
    if (sql.includes('FROM homepage_sections')) return sections;
    if (sql.includes('FROM promotions') || sql.includes('FROM homepage_brand_product_sections') || sql.includes('FROM homepage_category_product_sections')) return [];
    throw new Error('Unexpected query in isolated homepage test');
  },
  withTransaction: () => { throw new Error('Writes forbidden in isolated tests'); },
});
stub('../src/config/env', { env: { HOMEPAGE_OPTIONAL_TIMEOUT_MS: 40 } });
stub('../src/config/redis', { getJsonCache: async () => cachedAggregate,
  setJsonCache: async (...args: unknown[]) => { cacheWrites.push(args); }, delCache() {} });
stub('../src/utils/logger', { logger: { warn() {}, error() {} } });
stub('../src/utils/errors', { AppError: class extends Error {}, NotFoundError: class extends Error {} });
stub('../src/repositories/brand.repository', { BrandRepository: {} });
stub('../src/repositories/category.repository', { CategoryRepository: {} });
stub('../src/services/products.service', {
  getFeaturedProducts: async (limit: number) => { assert.equal(limit, 8); return read('featured'); },
  listProducts: async ({ sort, limit }: { sort: string; limit: number }) => {
    assert.equal(limit, 8); assert.ok(['rating', 'newest'].includes(sort));
    return { products: await read(sort === 'rating' ? 'trending' : 'newest') };
  }, getCategories: () => read('categories'), getBrands: () => read('brands'),
});
stub('../src/services/carousel.service', { getActiveSlides: async () => [] });
const { getPublicHomepageFull, getPublicHomepage } = require('../src/controllers/homepage.controller') as typeof import('../src/controllers/homepage.controller');
const { HOMEPAGE_PARTIAL } = require('../src/services/homepage.service') as typeof import('../src/services/homepage.service');
async function response(handler = getPublicHomepageFull) {
  let body: any;
  const locals: Record<string, unknown> = {};
  await handler({} as never, { locals, json(value: unknown) { body = value; } } as never,
    (error?: unknown) => { if (error) throw error; });
  if (handler === getPublicHomepageFull) {
    assert.equal(locals.homepageAggregateSuccessful, !body.partialFailures.some((section: string) =>
      ['featuredProducts', 'trendingProducts', 'categories'].includes(section)));
  }
  return body;
}

describe('homepage aggregate and CMS assembly', () => {
  beforeEach(() => {
    counts = {}; failRead = ''; hangRead = ''; cacheWrites = []; sections = []; items = [];
    cachedAggregate = null;
    blocks = ['brand_showcase', 'category_showcase', 'new_arrivals', 'best_sellers', 'featured_products', 'newsletter'].map((block_type, index) => ({
      id: String(index), block_type, display_order: index, is_active: true,
    }));
  });
  it('reuses exact aggregate reads, preserves newest semantics, active filtering, block order and product values', async () => {
    const body = await response();
    assert.deepEqual(body.partialFailures, []);
    assert.deepEqual(counts, { featured: 1, trending: 1, categories: 1, brands: 1, newest: 1 });
    assert.deepEqual(body.data.brands, [fixtures.brands[0]]);
    const resolved = body.data.homepage.homepage_blocks;
    assert.deepEqual(resolved.map((block: any) => block.block_type), blocks.map(block => block.block_type));
    assert.deepEqual(resolved[0].data.brands, fixtures.brands); // CMS retains its original unfiltered semantics.
    assert.deepEqual(resolved[2].data.products, fixtures.newest);
    assert.deepEqual(resolved[3].data.products, fixtures.trending);
    assert.deepEqual(resolved[4].data.products, fixtures.featured);
    assert.equal(cacheWrites.length, 1); assert.equal(cacheWrites[0][0], 'homepage:full:v1'); assert.equal(cacheWrites[0][2], 60);
    await response(); assert.equal(counts.featured, 2); // No cross-request promise cache.
  });
  it('preserves grouped CMS content when sections exist', async () => {
    sections = [{ id: 'cms', section_key: 'hero_carousel' }, { id: 'newsletter', section_key: 'newsletter' }];
    items = [{ id: 'slide', section_id: 'cms', image_url: '/synthetic.jpg' }];
    const body = await response();
    assert.deepEqual(body.data.homepage.hero_carousel, items);
    assert.equal(body.data.homepage.newsletter.id, 'newsletter');
    assert.deepEqual(body.partialFailures, []);
  });
  it('marks cached aggregate responses for timing without repeating service reads', async () => {
    const body = await response();
    cachedAggregate = body;
    counts = {};
    assert.equal(await response(), body);
    assert.deepEqual(counts, {});
  });
  it('isolates a failed optional block and never caches the incomplete result', async () => {
    failRead = 'newest';
    const body = await response();
    assert.deepEqual(body.partialFailures, ['homepage']);
    assert.equal(body.data.homepage[HOMEPAGE_PARTIAL], true);
    assert.deepEqual(body.data.homepage.homepage_blocks.map((block: any) => block.block_type), blocks.filter(block => block.block_type !== 'new_arrivals').map(block => block.block_type));
    assert.deepEqual(body.data.featuredProducts, fixtures.featured);
    assert.deepEqual(cacheWrites, []);
  });
  it('bounds a hung optional block, preserving successful catalog/CMS blocks', async () => {
    hangRead = 'newest';
    const body = await response();
    assert.deepEqual(body.partialFailures, ['homepage']);
    assert.ok(body.data.homepage.homepage_blocks.some((block: any) => block.block_type === 'featured_products'));
    assert.deepEqual(body.data.featuredProducts, fixtures.featured); assert.deepEqual(cacheWrites, []);
  });
  it('marks essential catalog failure rather than treating fallback arrays as a valid empty catalog', async () => {
    failRead = 'featured';
    const body = await response();
    assert.deepEqual(body.partialFailures, ['featuredProducts', 'homepage']);
    assert.deepEqual(body.data.featuredProducts, []); assert.deepEqual(cacheWrites, []);
    assert.equal(counts.featured, 1); // Rejections are reused, too; no hidden retry.
  });
  it('also avoids caching incomplete content through the legacy CMS endpoint', async () => {
    failRead = 'newest';
    const body = await response(getPublicHomepage);
    assert.equal(body.success, true); assert.equal(body.homepage[HOMEPAGE_PARTIAL], true);
    assert.deepEqual(cacheWrites, []);
  });
});
