--> HAND-WRITTEN (langlion plan Faza 6, EPIK 44).
-->
--> Seed notification_event_type rows for the client notification-settings page
--> (Faza 6). The settings UI renders one switch per row from this table, so each
--> code below has a matching row in the "Notifications" → "types"/"preferences"
--> i18n catalogs and an email template in the adapter contract.
-->
-->   - session-reminder              → client, reminder before an upcoming session
-->   - session-rescheduled           → client, a session they are booked into moved
-->   - invoice-available             → client, an invoice/FA for their purchase is ready
-->   - individual-session-rejected   → client, an individual session request declined
-->   - qualification-card-reminder   → client, qualification card still missing
-->
--> The last three are seeded RESERVED: their templates and i18n exist, but the
--> emitting flows (invoice generation F27, slot-first rejection, qualification
--> card reminder) are not built yet. Seeding the row now keeps the settings UI
--> stable when they land. ON CONFLICT DO NOTHING — safe to re-run.
INSERT INTO "notification_event_type" ("code", "default_channels", "is_overridable") VALUES
  ('session-reminder', '{"email","in_app"}', true),
  ('session-rescheduled', '{"email","in_app"}', true),
  ('invoice-available', '{"email","in_app"}', true),
  ('individual-session-rejected', '{"email","in_app"}', true),
  ('qualification-card-reminder', '{"email","in_app"}', true)
ON CONFLICT ("code") DO NOTHING;
