-- Claims, order, stock, coupon usage and cart consumption commit/rollback together.
-- Only hashes of the actor/key/request are stored; response has the same private
-- order information already retained in orders and is never logged.
CREATE TABLE IF NOT EXISTS checkout_requests (
  scope_hash CHAR(64) NOT NULL,
  key_hash CHAR(64) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  order_id UUID UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  response JSONB,
  cache_slugs TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope_hash, key_hash),
  CHECK ((order_id IS NULL AND response IS NULL) OR (order_id IS NOT NULL AND response IS NOT NULL))
);
