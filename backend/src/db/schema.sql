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
                           CHECK (role IN ('customer', 'admin')),
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
    ALTER TABLE categories DROP COLUMN icon;
  END IF;
END;
$$;


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


-- ─────────────────────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID           NOT NULL REFERENCES users (id),
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

CREATE INDEX IF NOT EXISTS idx_orders_user_id   ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status    ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);


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


-- ─────────────────────────────────────────────────────────────────────────────
-- cart_items (server-side cart for authenticated users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cart_items (
  id          SERIAL   PRIMARY KEY,
  user_id     UUID     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  product_id  UUID     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  quantity    INTEGER  NOT NULL CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);


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
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_addresses_updated_at'
  ) THEN
    CREATE TRIGGER set_user_addresses_updated_at
      BEFORE UPDATE ON user_addresses
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
  is_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);

-- Trigger to update product rating
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE products
    SET 
      rating = (SELECT COALESCE(AVG(rating), 0.0) FROM reviews WHERE product_id = NEW.product_id),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = NEW.product_id)
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET 
      rating = (SELECT COALESCE(AVG(rating), 0.0) FROM reviews WHERE product_id = OLD.product_id),
      review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = OLD.product_id)
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
