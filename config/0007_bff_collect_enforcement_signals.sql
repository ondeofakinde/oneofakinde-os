CREATE TABLE IF NOT EXISTS bff_collect_enforcement_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL CHECK (
    signal_type IN (
      'invalid_listing_action_blocked',
      'invalid_amount_rejected',
      'invalid_transition_blocked',
      'unauthorized_transition_blocked',
      'cross_drop_transition_blocked',
      'invalid_settle_price_rejected',
      'reaward_blocked'
    )
  ),
  drop_id TEXT,
  offer_id TEXT,
  account_id TEXT,
  reason TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_collect_enforcement_signals_occurred_at
  ON bff_collect_enforcement_signals(occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_bff_collect_enforcement_signals_drop_id
  ON bff_collect_enforcement_signals(drop_id);
