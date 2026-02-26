CREATE TABLE IF NOT EXISTS bff_membership_entitlements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  studio_handle TEXT NOT NULL,
  world_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'canceled')),
  started_at TEXT NOT NULL,
  ends_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bff_membership_entitlements_account_id
  ON bff_membership_entitlements(account_id);

CREATE INDEX IF NOT EXISTS idx_bff_membership_entitlements_studio_handle
  ON bff_membership_entitlements(studio_handle);

CREATE INDEX IF NOT EXISTS idx_bff_membership_entitlements_world_id
  ON bff_membership_entitlements(world_id);

CREATE TABLE IF NOT EXISTS bff_live_sessions (
  id TEXT PRIMARY KEY,
  studio_handle TEXT NOT NULL,
  world_id TEXT,
  drop_id TEXT REFERENCES bff_catalog_drops(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  synopsis TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  mode TEXT NOT NULL CHECK (mode IN ('live')),
  eligibility_rule TEXT NOT NULL CHECK (eligibility_rule IN ('public', 'membership_active', 'drop_owner'))
);

CREATE INDEX IF NOT EXISTS idx_bff_live_sessions_starts_at
  ON bff_live_sessions(starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_live_sessions_world_id
  ON bff_live_sessions(world_id);

CREATE INDEX IF NOT EXISTS idx_bff_live_sessions_drop_id
  ON bff_live_sessions(drop_id);

CREATE INDEX IF NOT EXISTS idx_bff_live_sessions_studio_handle
  ON bff_live_sessions(studio_handle);
