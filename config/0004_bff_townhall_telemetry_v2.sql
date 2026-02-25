ALTER TABLE bff_townhall_telemetry_events
  ADD COLUMN IF NOT EXISTS metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE bff_townhall_telemetry_events
SET metadata_json = '{}'::jsonb
WHERE metadata_json IS NULL;

ALTER TABLE bff_townhall_telemetry_events
  DROP CONSTRAINT IF EXISTS bff_townhall_telemetry_events_event_type_check;

ALTER TABLE bff_townhall_telemetry_events
  ADD CONSTRAINT bff_townhall_telemetry_events_event_type_check
  CHECK (
    event_type IN (
      'watch_time',
      'completion',
      'collect_intent',
      'impression',
      'showroom_impression',
      'drop_opened',
      'drop_dwell_time',
      'preview_start',
      'preview_complete',
      'access_start',
      'access_complete',
      'interaction_like',
      'interaction_comment',
      'interaction_share',
      'interaction_save'
    )
  );

