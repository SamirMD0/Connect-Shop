CREATE TABLE IF NOT EXISTS homepage_blocks (
  id                          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_type                  VARCHAR(50)  NOT NULL,
  brand_product_section_id    UUID         REFERENCES homepage_brand_product_sections (id) ON DELETE CASCADE,
  category_product_section_id UUID         REFERENCES homepage_category_product_sections (id) ON DELETE CASCADE,
  promotion_id                INTEGER      REFERENCES promotions (id) ON DELETE CASCADE,
  display_order               INTEGER      NOT NULL DEFAULT 0,
  is_active                   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT homepage_blocks_block_type_check
    CHECK (
      block_type IN (
        'hero_carousel',
        'new_arrivals',
        'brand_product_section',
        'category_product_section',
        'promotion_banner',
        'best_sellers',
        'featured_products',
        'testimonials',
        'newsletter',
        'category_showcase',
        'brand_showcase'
      )
    ),
  CONSTRAINT homepage_blocks_display_order_check
    CHECK (display_order >= 0),
  CONSTRAINT homepage_blocks_reference_shape_check
    CHECK (
      (
        block_type = 'brand_product_section'
        AND brand_product_section_id IS NOT NULL
        AND category_product_section_id IS NULL
        AND promotion_id IS NULL
      )
      OR (
        block_type = 'category_product_section'
        AND brand_product_section_id IS NULL
        AND category_product_section_id IS NOT NULL
        AND promotion_id IS NULL
      )
      OR (
        block_type = 'promotion_banner'
        AND brand_product_section_id IS NULL
        AND category_product_section_id IS NULL
        AND promotion_id IS NOT NULL
      )
      OR (
        block_type IN (
          'hero_carousel',
          'new_arrivals',
          'best_sellers',
          'featured_products',
          'testimonials',
          'newsletter',
          'category_showcase',
          'brand_showcase'
        )
        AND brand_product_section_id IS NULL
        AND category_product_section_id IS NULL
        AND promotion_id IS NULL
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_homepage_blocks_active_order
  ON homepage_blocks (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_homepage_blocks_block_type
  ON homepage_blocks (block_type);

CREATE INDEX IF NOT EXISTS idx_homepage_blocks_brand_product_section_id
  ON homepage_blocks (brand_product_section_id);

CREATE INDEX IF NOT EXISTS idx_homepage_blocks_category_product_section_id
  ON homepage_blocks (category_product_section_id);

CREATE INDEX IF NOT EXISTS idx_homepage_blocks_promotion_id
  ON homepage_blocks (promotion_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_homepage_blocks_unique_fixed_block_type
  ON homepage_blocks (block_type)
  WHERE block_type IN (
    'hero_carousel',
    'new_arrivals',
    'best_sellers',
    'featured_products',
    'testimonials',
    'newsletter',
    'category_showcase',
    'brand_showcase'
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_homepage_blocks_updated_at'
  ) THEN
    CREATE TRIGGER set_homepage_blocks_updated_at
      BEFORE UPDATE ON homepage_blocks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

INSERT INTO homepage_blocks (block_type, display_order)
SELECT block_type, display_order
FROM (
  VALUES
    ('hero_carousel', 0),
    ('brand_showcase', 10),
    ('category_showcase', 20),
    ('new_arrivals', 30),
    ('best_sellers', 40),
    ('testimonials', 50),
    ('newsletter', 60)
) AS defaults(block_type, display_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM homepage_blocks existing
  WHERE existing.block_type = defaults.block_type
);
