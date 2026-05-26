CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_key VARCHAR(100) NOT NULL,
  section_type VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  subtitle TEXT,
  description TEXT,
  eyebrow VARCHAR(255),
  button_text VARCHAR(100),
  button_link TEXT,
  image_url TEXT,
  background_image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS homepage_section_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID NOT NULL REFERENCES homepage_sections(id) ON DELETE CASCADE,
  title VARCHAR(255),
  subtitle TEXT,
  description TEXT,
  button_text VARCHAR(100),
  button_link TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_section_key
  ON homepage_sections (section_key);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_active_order
  ON homepage_sections (is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_homepage_section_items_section_active_order
  ON homepage_section_items (section_id, is_active, sort_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_homepage_sections_updated_at'
  ) THEN
    CREATE TRIGGER set_homepage_sections_updated_at
      BEFORE UPDATE ON homepage_sections
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_homepage_section_items_updated_at'
  ) THEN
    CREATE TRIGGER set_homepage_section_items_updated_at
      BEFORE UPDATE ON homepage_section_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
