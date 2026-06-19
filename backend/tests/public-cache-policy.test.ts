import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CACHE_KEYS,
  CACHE_TTL_SECONDS,
  normalizeProductListCacheParams,
} from '../src/utils/cachePolicy';

describe('public cache policy', () => {
  it('defines bounded public cache keys and TTLs for Phase C targets', () => {
    assert.equal(CACHE_KEYS.homepageFull, 'homepage:full:v1');
    assert.equal(CACHE_KEYS.brandsPublic, 'brands:public:v1');
    assert.equal(CACHE_TTL_SECONDS.homepageFull, 60);
    assert.equal(CACHE_TTL_SECONDS.brands, 600);
  });

  it('normalizes product list cache parameters to avoid equivalent-key drift', () => {
    const left = normalizeProductListCacheParams({
      page: 1.9,
      limit: 500,
      category: ' phones ',
      search: ' headphones ',
      ids: [' b ', 'a', ''],
      brand: ' sony ',
      specs: { ' RAM ': ' 16GB ', Storage: ' 512GB ', empty: '' },
    });
    const right = normalizeProductListCacheParams({
      page: 1,
      limit: 100,
      category: 'phones',
      search: 'headphones',
      ids: ['a', 'b'],
      brand: 'sony',
      specs: { Storage: '512GB', RAM: '16GB' },
    });

    assert.deepEqual(left, right);
    assert.equal(CACHE_KEYS.productList(left), CACHE_KEYS.productList(right));
  });

  it('keeps private/user-specific cache keys out of the shared public policy', async () => {
    const exportedKeyNames = Object.keys(CACHE_KEYS).join(' ');

    assert.doesNotMatch(exportedKeyNames, /cart|checkout|order|session|csrf|auth|wishlist|admin/i);
  });
});

describe('public cache invalidation wiring', () => {
  it('invalidates homepage aggregate cache from homepage, carousel, product, category, and brand writes', async () => {
    const homepageSource = await readFile(join(process.cwd(), 'src/services/homepage.service.ts'), 'utf8');
    const carouselSource = await readFile(join(process.cwd(), 'src/services/carousel.service.ts'), 'utf8');
    const productsSource = await readFile(join(process.cwd(), 'src/services/products.service.ts'), 'utf8');

    assert.match(homepageSource, /delCache\(CACHE_KEYS\.homepageActive,\s*CACHE_KEYS\.homepageFull\)/);
    assert.match(carouselSource, /delCache\(CACHE_KEYS\.carouselActive,\s*CACHE_KEYS\.homepageFull\)/);
    assert.match(productsSource, /CACHE_KEYS\.categoriesTree,\s*CACHE_KEYS\.homepageFull/);
    assert.match(productsSource, /delCache\(CACHE_KEYS\.homepageFull,/);
    assert.match(productsSource, /CACHE_KEYS\.brandsPublic,\s*CACHE_KEYS\.homepageFull/);
    assert.match(productsSource, /await invalidateBrandCaches\(\)/);
  });

  it('caches the full homepage response only when all aggregate sections resolve', async () => {
    const controllerSource = await readFile(join(process.cwd(), 'src/controllers/homepage.controller.ts'), 'utf8');

    assert.match(controllerSource, /getJsonCache<HomepageAggregateResponse>\(CACHE_KEYS\.homepageFull\)/);
    assert.match(controllerSource, /partialFailures\.length === 0/);
    assert.match(controllerSource, /setJsonCache\(CACHE_KEYS\.homepageFull,\s*responseBody,\s*CACHE_TTL_SECONDS\.homepageFull\)/);
  });

  it('caches public active brands without changing the response shape', async () => {
    const controllerSource = await readFile(join(process.cwd(), 'src/controllers/brands.controller.ts'), 'utf8');

    assert.match(controllerSource, /getJsonCache<Brand\[\]>\(CACHE_KEYS\.brandsPublic\)/);
    assert.match(controllerSource, /filter\(\(brand\) => brand\.is_active\)/);
    assert.match(controllerSource, /setJsonCache\(CACHE_KEYS\.brandsPublic,\s*brands,\s*CACHE_TTL_SECONDS\.brands\)/);
    assert.match(controllerSource, /res\.json\(\{ success: true, brands \}\)/);
  });
});
