-- Phase E: public storefront read indexes.
-- These match the actual product listing/detail ORDER BY and WHERE patterns.

CREATE INDEX IF NOT EXISTS idx_products_featured_created_at
  ON products (is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_category_featured_created_at
  ON products (category_id, is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_brand_featured_created_at
  ON products (brand_id, is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_featured_rating
  ON products (rating DESC)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_product_images_product_sort
  ON product_images (product_id, sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_created_at
  ON product_variants (product_id, created_at ASC);
