CREATE TABLE IF NOT EXISTS bff_townhall_likes (
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  liked_at TEXT NOT NULL,
  PRIMARY KEY (account_id, drop_id)
);

CREATE TABLE IF NOT EXISTS bff_townhall_comments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bff_townhall_shares (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bff_accounts(id) ON DELETE CASCADE,
  drop_id TEXT NOT NULL REFERENCES bff_catalog_drops(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'internal_dm', 'whatsapp', 'telegram')),
  shared_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_likes_drop_id ON bff_townhall_likes(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_likes_account_id ON bff_townhall_likes(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_comments_drop_id ON bff_townhall_comments(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_comments_account_id ON bff_townhall_comments(account_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_shares_drop_id ON bff_townhall_shares(drop_id);
CREATE INDEX IF NOT EXISTS idx_bff_townhall_shares_account_id ON bff_townhall_shares(account_id);
