CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_rating ON products (rating DESC);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created_at ON reviews (status, created_at DESC);
