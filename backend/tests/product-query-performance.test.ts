import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('public product query performance indexes', () => {
  it('adds indexes matching real storefront product list and detail query patterns', async () => {
    const migration = await readFile(
      join(process.cwd(), 'src/db/migrations/012_public_read_product_indexes.sql'),
      'utf8'
    );

    assert.match(migration, /idx_products_featured_created_at/);
    assert.match(migration, /ON products \(is_featured DESC, created_at DESC\)/);
    assert.match(migration, /idx_products_category_featured_created_at/);
    assert.match(migration, /ON products \(category_id, is_featured DESC, created_at DESC\)/);
    assert.match(migration, /idx_products_brand_featured_created_at/);
    assert.match(migration, /ON products \(brand_id, is_featured DESC, created_at DESC\)/);
    assert.match(migration, /idx_products_featured_rating/);
    assert.match(migration, /WHERE is_featured = true/);
    assert.match(migration, /idx_product_images_product_sort/);
    assert.match(migration, /ON product_images \(product_id, sort_order ASC\)/);
    assert.match(migration, /idx_product_variants_product_created_at/);
    assert.match(migration, /ON product_variants \(product_id, created_at ASC\)/);
  });

  it('keeps product list sort keys whitelisted and aligned with Phase E indexes', async () => {
    const serviceSource = await readFile(join(process.cwd(), 'src/services/products.service.ts'), 'utf8');
    const repositorySource = await readFile(join(process.cwd(), 'src/repositories/product.repository.ts'), 'utf8');

    assert.match(serviceSource, /price_asc: 'p\.price ASC'/);
    assert.match(serviceSource, /price_desc: 'p\.price DESC'/);
    assert.match(serviceSource, /newest: 'p\.created_at DESC'/);
    assert.match(serviceSource, /rating: 'p\.rating DESC'/);
    assert.match(serviceSource, /popular: 'p\.review_count DESC, p\.rating DESC'/);
    assert.match(serviceSource, /ORDER BY from sort param \(whitelist to prevent SQL injection\)/);
    assert.match(repositorySource, /ORDER BY \$\{orderBy\}/);
    assert.match(repositorySource, /WHERE p\.slug = \$1/);
    assert.match(repositorySource, /SELECT \* FROM product_images WHERE product_id = \$1 ORDER BY sort_order ASC/);
    assert.match(repositorySource, /SELECT \* FROM product_variants WHERE product_id = \$1 ORDER BY created_at ASC/);
  });

  it('does not add indexes for private auth, cart, checkout, order, or admin tables in Phase E', async () => {
    const migration = await readFile(
      join(process.cwd(), 'src/db/migrations/012_public_read_product_indexes.sql'),
      'utf8'
    );

    assert.doesNotMatch(migration, /\b(users|sessions|cart_items|orders|order_items|admin_audit_logs|reviews)\b/i);
  });
});
