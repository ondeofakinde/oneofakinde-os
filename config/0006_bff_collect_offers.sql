CREATE TABLE IF NOT EXISTS bff_collect_offers (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('sale', 'auction', 'resale')),
  amount_usd NUMERIC(12, 2) NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('listed', 'offer_submitted', 'countered', 'accepted', 'settled', 'expired', 'withdrawn')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT,
  execution_visibility TEXT NOT NULL CHECK (execution_visibility IN ('public', 'private')),
  execution_price_usd NUMERIC(12, 2)
);

CREATE INDEX IF NOT EXISTS idx_bff_collect_offers_drop_id ON bff_collect_offers(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_collect_offers_account_id ON bff_collect_offers(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_collect_offers_updated_at ON bff_collect_offers(updated_at DESC);
