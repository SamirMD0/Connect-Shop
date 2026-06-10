-- Phase 3A: Production performance indexes
-- Non-destructive indexes for frequent ecommerce lookup paths.

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
  ON cart_items (product_id);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_expires_at
  ON cart_items (user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_orders_user_created_at
  ON orders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id
  ON order_items (product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
  ON order_items (variant_id);
