CREATE TABLE IF NOT EXISTS bff_watch_access_grants (
  token_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_watch_access_grants_account_id
  ON bff_watch_access_grants(account_id);

CREATE INDEX IF NOT EXISTS idx_bff_watch_access_grants_drop_id
  ON bff_watch_access_grants(drop_id);

CREATE INDEX IF NOT EXISTS idx_bff_watch_access_grants_expires_at
  ON bff_watch_access_grants(expires_at DESC);
