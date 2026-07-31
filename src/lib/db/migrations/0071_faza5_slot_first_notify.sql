--> HAND-WRITTEN (langlion plan Faza 5, EPIK 34, §2.32).
-->
--> Seed notification_event_type rows for slot-first individual sessions:
-->   - booking-confirmed             → client, when a slot-first booking is created
-->   - slot-first-session-created    → trainer, when a session is created for them
--> Both default to email + in_app and are overridable (parents/trainers can
--> mute them once F14 preferences UI covers these event types).
-->
--> ON CONFLICT DO NOTHING — safe to re-run when a later migration adds
--> more event types.
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable") VALUES
  ('booking-confirmed', '{"email","in_app"}', true),
  ('slot-first-session-created', '{"email","in_app"}', true)
ON CONFLICT ("code") DO NOTHING;
