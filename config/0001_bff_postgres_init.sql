CREATE TABLE IF NOT EXISTS bff_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_catalog_drops (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_catalog_worlds (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_catalog_studios (
  handle TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  roles TEXT[] NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_sessions (
  token TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_ownerships (
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  certificate_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  PRIMARY KEY (account_id, drop_id)
);

CREATE TABLE IF NOT EXISTS bff_saved_drops (
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  saved_at TEXT NOT NULL,
  PRIMARY KEY (account_id, drop_id)
);

CREATE TABLE IF NOT EXISTS bff_receipts (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  amount_usd NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  purchased_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_certificates (
  id TEXT PRIMARY KEY,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  drop_title TEXT NOT NULL,
  owner_handle TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  receipt_id TEXT NOT NULL REFERENCES bff_receipts(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  owner_account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bff_payments (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  amount_usd NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  checkout_session_id TEXT,
  checkout_url TEXT,
  provider_payment_intent_id TEXT,
  receipt_id TEXT REFERENCES bff_receipts(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_sessions_account_id ON bff_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_ownerships_account_id ON bff_ownerships(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_saved_drops_account_id ON bff_saved_drops(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_receipts_account_id ON bff_receipts(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_certificates_owner_account_id ON bff_certificates(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_bff_payments_account_id ON bff_payments(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_payments_checkout_session_id ON bff_payments(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_bff_payments_provider_payment_intent_id ON bff_payments(provider_payment_intent_id);
