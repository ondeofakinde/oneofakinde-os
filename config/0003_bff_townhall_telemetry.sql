CREATE TABLE IF NOT EXISTS bff_townhall_telemetry_events (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES bff_accounts(id) ON DELETE SET NULL,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('watch_time', 'completion', 'collect_intent')),
  watch_time_seconds NUMERIC(12, 3) NOT NULL DEFAULT 0,
  completion_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_telemetry_drop_id
  ON bff_townhall_telemetry_events(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_telemetry_account_id
  ON bff_townhall_telemetry_events(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_telemetry_event_type
  ON bff_townhall_telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_telemetry_occurred_at
  ON bff_townhall_telemetry_events(occurred_at DESC);
