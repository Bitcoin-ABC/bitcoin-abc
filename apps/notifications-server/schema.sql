-- Mobile push notification device tokens (FCM), keyed by active_address
CREATE TABLE IF NOT EXISTS push_device_tokens (
  id BIGSERIAL PRIMARY KEY,
  active_address VARCHAR(512) NOT NULL,
  platform VARCHAR(16) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_push_device_tokens_fcm_token UNIQUE (fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_push_device_tokens_active_address
  ON push_device_tokens(active_address);
