CREATE TABLE IF NOT EXISTS bff_world_release_queue (
  id TEXT PRIMARY KEY,
  studio_handle TEXT NOT NULL,
  world_id TEXT NOT NULL,
  drop_id TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  pacing_mode TEXT NOT NULL CHECK (pacing_mode IN ('manual', 'daily', 'weekly')),
  pacing_window_hours INTEGER NOT NULL CHECK (pacing_window_hours >= 0),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'published', 'canceled')),
  created_by_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NULL,
  canceled_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS bff_world_release_queue_studio_world_idx
  ON bff_world_release_queue (studio_handle, world_id, scheduled_for ASC);
