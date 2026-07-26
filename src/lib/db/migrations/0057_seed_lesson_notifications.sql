--> HAND-WRITTEN (langlion plan Faza 28, EPIK 43, §2.42).
-->
--> Seed notification_event_type rows for lesson_topic_added and
--> homework_assigned. Both are overridable (is_overridable=tak per spec)
--> so parents can toggle notifications per event type via the
--> notification_preferences UI when F14 in-app channel lands.
-->
--> ON CONFLICT DO NOTHING — safe to re-run when a later migration adds
--> more event types.
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable") VALUES
  ('lesson_topic_added', '{"email","in_app"}', true),
  ('homework_assigned', '{"email","in_app"}', true)
ON CONFLICT ("code") DO NOTHING;
