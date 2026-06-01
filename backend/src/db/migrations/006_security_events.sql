CREATE TABLE IF NOT EXISTS security_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  VARCHAR(100) NOT NULL,
  severity    VARCHAR(20)  NOT NULL DEFAULT 'info'
                         CHECK (severity IN ('info', 'warning', 'high', 'critical')),
  user_id     UUID        REFERENCES users (id) ON DELETE SET NULL,
  session_id  UUID,
  ip_address  INET,
  user_agent  TEXT,
  route       TEXT,
  method      VARCHAR(10),
  request_id  VARCHAR(100),
  metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events (event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events (severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events (user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip_address ON security_events (ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events (created_at DESC);
