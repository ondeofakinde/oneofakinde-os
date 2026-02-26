ALTER TABLE bff_townhall_comments
  ADD COLUMN IF NOT EXISTS parent_comment_id TEXT,
  ADD COLUMN IF NOT EXISTS appeal_requested_at TEXT,
  ADD COLUMN IF NOT EXISTS appeal_requested_by_account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_bff_townhall_comments_parent_comment_id
  ON bff_townhall_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_bff_townhall_comments_appeal_requested_at
  ON bff_townhall_comments(appeal_requested_at);
