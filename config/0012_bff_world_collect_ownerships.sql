CREATE TABLE IF NOT EXISTS bff_world_collect_ownerships (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  world_id TEXT NOT NULL,
  bundle_type TEXT NOT NULL CHECK (bundle_type IN ('current_only', 'season_pass_window', 'full_world')),
  status TEXT NOT NULL CHECK (status IN ('active', 'upgraded')),
  purchased_at TIMESTAMPTZ NOT NULL,
  amount_paid_usd NUMERIC(12,2) NOT NULL,
  previous_ownership_credit_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  proration_strategy TEXT NOT NULL,
  upgraded_to_bundle_type TEXT NULL CHECK (upgraded_to_bundle_type IN ('current_only', 'season_pass_window', 'full_world')),
  upgraded_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS bff_world_collect_ownerships_account_world_idx
  ON bff_world_collect_ownerships (account_id, world_id, purchased_at DESC);
