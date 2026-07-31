--> HAND-WRITTEN (langlion plan Faza 6, EPIK 44).
-->
--> The client notification-settings page renders a switch per type in
--> `CLIENT_PREFERENCE_EVENT_TYPES` and SAVES every one of them as a
--> `notification_preference` row. That row's `event_type` is an FK to
--> `notification_event_type(code)`, so each catalog type must exist in the
--> table or the save loop crashes with a foreign-key violation.
-->
--> `group-change-rejected` (Faza 15, group swap) is declared in the TS
--> `NOTIFICATION_TYPES` list and emitted by `change-group.ts`, but no migration
--> ever seeded it — the emit path tolerates the gap via a default-channels
--> fallback, while a settings SAVE does not. Seed it here. ON CONFLICT DO
--> NOTHING — safe to re-run; the row also covers the catalog on fresh DBs once
--> this migration is applied by `db:migrate`.
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable") VALUES
  ('group-change-rejected', '{"email","in_app"}', true)
ON CONFLICT ("code") DO NOTHING;
