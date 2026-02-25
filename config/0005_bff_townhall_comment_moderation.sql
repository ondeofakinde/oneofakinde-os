ALTER TABLE bff_townhall_comments
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reported_at TEXT,
  ADD COLUMN IF NOT EXISTS moderated_at TEXT,
  ADD COLUMN IF NOT EXISTS moderated_by_account_id TEXT;

ALTER TABLE bff_townhall_comments
  DROP CONSTRAINT IF EXISTS bff_townhall_comments_status_check;

ALTER TABLE bff_townhall_comments
  ADD CONSTRAINT bff_townhall_comments_status_check
  CHECK (status IN ('visible', 'hidden'));

CREATE INDEX IF NOT EXISTS idx_bff_townhall_comments_status
  ON bff_townhall_comments(status);
