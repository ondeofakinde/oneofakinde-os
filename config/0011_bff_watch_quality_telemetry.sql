ALTER TABLE bff_townhall_telemetry_events
  DROP CONSTRAINT IF EXISTS bff_townhall_telemetry_events_event_type_check;

ALTER TABLE bff_townhall_telemetry_events
  ADD CONSTRAINT bff_townhall_telemetry_events_event_type_check
  CHECK (
    event_type IN (
      'watch_time',
      'completion',
      'collect_intent',
      'quality_change',
      'rebuffer',
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
