-- One durable receipt per authenticated user and merge attempt. Claims and
-- accepted cart changes commit together; rollback releases the key.
CREATE TABLE IF NOT EXISTS cart_merge_requests (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash CHAR(64) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key_hash)
);
