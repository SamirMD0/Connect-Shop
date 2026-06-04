CREATE TABLE IF NOT EXISTS homepage_category_product_sections (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(255) NOT NULL,
  subtitle      TEXT,
  category_id   INTEGER      NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  product_limit INTEGER      NOT NULL DEFAULT 8,
  sort_key      VARCHAR(30)  NOT NULL DEFAULT 'newest',
  layout        VARCHAR(30)  NOT NULL DEFAULT 'grid',
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT homepage_category_product_sections_product_limit_check
    CHECK (product_limit IN (4, 8, 12)),
  CONSTRAINT homepage_category_product_sections_sort_key_check
    CHECK (sort_key IN ('newest', 'rating', 'price_asc', 'price_desc')),
  CONSTRAINT homepage_category_product_sections_layout_check
    CHECK (layout IN ('grid', 'rail')),
  CONSTRAINT homepage_category_product_sections_display_order_check
    CHECK (display_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_homepage_category_product_sections_active_order
  ON homepage_category_product_sections (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_homepage_category_product_sections_category_id
  ON homepage_category_product_sections (category_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_homepage_category_product_sections_updated_at'
  ) THEN
    CREATE TRIGGER set_homepage_category_product_sections_updated_at
      BEFORE UPDATE ON homepage_category_product_sections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
