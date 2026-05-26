-- backend/src/db/schema.sql
-- ElecSHOP Database Schema
-- Run once on startup; all statements are idempotent (CREATE TABLE IF NOT EXISTS)

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search on product names


-- ─────────────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id   VARCHAR(255) UNIQUE,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(255) NOT NULL,
  avatar_url  TEXT,
  role        VARCHAR(20)  NOT NULL DEFAULT 'customer'
                           CHECK (role IN ('customer', 'support', 'manager', 'admin', 'super_admin')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email     ON users (email);

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_confirmed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('customer', 'support', 'manager', 'admin', 'super_admin'));
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- sessions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token       VARCHAR(512) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_token      ON sessions (token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions (revoked_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- admin_audit_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID        REFERENCES users (id) ON DELETE SET NULL,
  action       VARCHAR(20) NOT NULL,
  target_type  VARCHAR(100) NOT NULL,
  target_id    TEXT,
  request_id   TEXT,
  ip_address   INET,
  user_agent   TEXT,
  status_code  INTEGER,
  payload      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor_id ON admin_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_logs (created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- email/password auth tokens
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  purpose     VARCHAR(30) NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_purpose ON auth_tokens (purpose);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens (expires_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- oauth_states
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_states (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states (expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_used_at ON oauth_states (used_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- user_addresses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_addresses (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label            VARCHAR(80) NOT NULL DEFAULT 'Home',
  recipient_name   VARCHAR(200) NOT NULL,
  phone            VARCHAR(30) NOT NULL,
  address_line1    TEXT NOT NULL,
  address_line2    TEXT,
  city             VARCHAR(120) NOT NULL,
  state            VARCHAR(120),
  zip_code         VARCHAR(30),
  country          VARCHAR(120) NOT NULL DEFAULT 'Lebanon',
  notes            TEXT,
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  image_url   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Migrate icon -> image_url if the old column still exists (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
  END IF;
END;
$$;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories (id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories (parent_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- brands
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  logo_url    TEXT,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands (slug);
CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands (is_active);


-- ─────────────────────────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255)   NOT NULL,
  slug         VARCHAR(255)   NOT NULL UNIQUE,
  description  TEXT,
  price        DECIMAL(10, 2) NOT NULL CHECK (price > 0),
  image_url    TEXT,
  category_id  INTEGER        NOT NULL REFERENCES categories (id),
  stock        INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  rating       DECIMAL(2, 1)  NOT NULL DEFAULT 0.0
                             CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER        NOT NULL DEFAULT 0,
  is_featured  BOOLEAN        NOT NULL DEFAULT FALSE,
  specs        JSONB,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug        ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_featured  ON products (is_featured);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm   ON products USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products (rating DESC);

ALTER TABLE products ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brands (id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON products (sku)
  WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products (brand_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- product_images
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id          SERIAL PRIMARY KEY,
  product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  alt_text    VARCHAR(255),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images (product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- product_variants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku         VARCHAR(100) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  price       DECIMAL(10,2) NOT NULL CHECK (price > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  attributes  JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_sku_unique
  ON product_variants (sku);


-- ─────────────────────────────────────────────────────────────────────────────
-- product_questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_questions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users (id) ON DELETE SET NULL,
  question     TEXT NOT NULL,
  answer       TEXT,
  answered_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_questions_product_id ON product_questions (product_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_created_at ON product_questions (created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID           REFERENCES users (id),
  status           VARCHAR(30)    NOT NULL DEFAULT 'confirmed'
                                  CHECK (status IN ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  total            DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  shipping_address JSONB          NOT NULL,
  payment_method   VARCHAR(30)    NOT NULL DEFAULT 'cod',
  payment_status   VARCHAR(30)    NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Add payment columns if they don't exist (for existing DBs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN payment_method VARCHAR(30) NOT NULL DEFAULT 'cod';
    ALTER TABLE orders ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'pending';
  END IF;
END;
$$;

ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_carrier VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_orders_user_id   ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON orders (guest_email);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders (tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders (updated_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- order_status_history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id          SERIAL      PRIMARY KEY,
  order_id    UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  status      VARCHAR(30) NOT NULL,
  note        TEXT,
  created_by  UUID        REFERENCES users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history (order_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- return_requests
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS return_requests (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users (id) ON DELETE SET NULL,
  reason      TEXT        NOT NULL,
  status      VARCHAR(30) NOT NULL DEFAULT 'requested'
                          CHECK (status IN ('requested', 'approved', 'rejected', 'refunded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests (order_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                  SERIAL         PRIMARY KEY,
  order_id            UUID           NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id          UUID           NOT NULL REFERENCES products (id),
  quantity            INTEGER        NOT NULL CHECK (quantity > 0),
  price_at_purchase   DECIMAL(10, 2) NOT NULL CHECK (price_at_purchase > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants (id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(255);


-- ─────────────────────────────────────────────────────────────────────────────
-- cart_items (server-side cart for authenticated users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id          SERIAL   PRIMARY KEY,
  user_id     UUID     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id  UUID     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity    INTEGER  NOT NULL CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants (id) ON DELETE CASCADE;
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours');
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_no_variant
  ON cart_items (user_id, product_id)
  WHERE variant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_user_product_variant
  ON cart_items (user_id, product_id, variant_id)
  WHERE variant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cart_items_expires_at ON cart_items (expires_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- updated_at auto-update trigger function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that have updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_users_updated_at'
  ) THEN
    CREATE TRIGGER set_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_products_updated_at'
  ) THEN
    CREATE TRIGGER set_products_updated_at
      BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_brands_updated_at'
  ) THEN
    CREATE TRIGGER set_brands_updated_at
      BEFORE UPDATE ON brands
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_addresses_updated_at'
  ) THEN
    CREATE TRIGGER set_user_addresses_updated_at
      BEFORE UPDATE ON user_addresses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_orders_updated_at'
  ) THEN
    CREATE TRIGGER set_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_return_requests_updated_at'
  ) THEN
    CREATE TRIGGER set_return_requests_updated_at
      BEFORE UPDATE ON return_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- carousel_slides (homepage carousel managed by admins)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carousel_slides (
  id            SERIAL       PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  subtitle      TEXT,
  image_url     TEXT         NOT NULL,
  link_url      TEXT,
  button_text   VARCHAR(100),
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carousel_active_order
  ON carousel_slides (is_active, display_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_carousel_updated_at'
  ) THEN
    CREATE TRIGGER set_carousel_updated_at
      BEFORE UPDATE ON carousel_slides
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- promotions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id            SERIAL       PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  image_url     TEXT,
  link_url      TEXT,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  display_order INTEGER      NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active_order
  ON promotions (is_active, display_order);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_promotions_updated_at'
  ) THEN
    CREATE TRIGGER set_promotions_updated_at
      BEFORE UPDATE ON promotions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- coupons
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id           SERIAL       PRIMARY KEY,
  code         VARCHAR(50)  NOT NULL UNIQUE,
  description  TEXT,
  type         VARCHAR(20)  NOT NULL CHECK (type IN ('percent', 'fixed')),
  value        DECIMAL(10,2) NOT NULL CHECK (value > 0),
  starts_at    TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  usage_limit  INTEGER      CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count   INTEGER      NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons (is_active);

CREATE TABLE IF NOT EXISTS coupon_usage (
  id          SERIAL      PRIMARY KEY,
  coupon_id   INTEGER     NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
  order_id    UUID        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES users (id) ON DELETE SET NULL,
  guest_email VARCHAR(255),
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage (order_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_coupons_updated_at'
  ) THEN
    CREATE TRIGGER set_coupons_updated_at
      BEFORE UPDATE ON coupons
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- abandoned cart recovery
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abandoned_cart_recovery (
  id          SERIAL       PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  cart_total  DECIMAL(10,2) NOT NULL DEFAULT 0,
  item_count  INTEGER      NOT NULL DEFAULT 0,
  phone       VARCHAR(30),
  email       VARCHAR(255),
  status      VARCHAR(30)  NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'sent', 'dismissed')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_abandoned_cart_recovery_status ON abandoned_cart_recovery (status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_abandoned_cart_recovery_updated_at'
  ) THEN
    CREATE TRIGGER set_abandoned_cart_recovery_updated_at
      BEFORE UPDATE ON abandoned_cart_recovery
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup expired sessions helper (can be called via cron / startup)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────────────────────
-- wishlists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- reviews
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID        NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating      INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(255),
  body        TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'published'
                          CHECK (status IN ('pending', 'published', 'hidden', 'rejected')),
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  moderated_by UUID       REFERENCES users (id) ON DELETE SET NULL,
  moderated_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reviews_status_check'
      AND conrelid = 'reviews'::regclass
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_status_check
      CHECK (status IN ('pending', 'published', 'hidden', 'rejected'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created_at ON reviews (status, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        REFERENCES users (id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  data        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- newsletter_subscribers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  status          VARCHAR(30)  NOT NULL DEFAULT 'subscribed'
                              CHECK (status IN ('subscribed', 'unsubscribed')),
  source          VARCHAR(100),
  subscribed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers (status);

-- Trigger to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET 
      rating = (SELECT COALESCE(AVG(rating), 0.0) FROM reviews WHERE product_id = NEW.product_id AND status = 'published'),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id AND status = 'published')
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET 
      rating = (SELECT COALESCE(AVG(rating), 0.0) FROM reviews WHERE product_id = OLD.product_id AND status = 'published'),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = OLD.product_id AND status = 'published')
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_product_rating'
  ) THEN
    CREATE TRIGGER trigger_update_product_rating
      AFTER INSERT OR UPDATE OR DELETE ON reviews
      FOR EACH ROW EXECUTE FUNCTION update_product_rating();
  END IF;
END;
$$;
