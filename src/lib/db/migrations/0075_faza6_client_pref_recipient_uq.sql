--> HAND-WRITTEN (langlion plan Faza 6, EPIK 44 — fix).
-->
--> The client-preferences upsert (`setClientPreference` in
--> src/features/notifications/data.ts) targets ON CONFLICT
--> (recipient_type, recipient_id, event_type). That requires a unique index on
--> those columns. The comment in 0073 credited it to migration 0032, but 0032
--> only ADDED the columns — the constraint was never migrated and only ever
--> existed as a manual patch on the dev DB. A clean rebuild exposed the gap:
--> the upsert failed with "no unique or exclusion constraint matching the
--> ON CONFLICT specification".
-->
--> Staff rows are unaffected: (userId, type) stays unique (NULLs are distinct),
--> and every staff write also fills recipient_type='staff' / recipient_id=userId /
--> event_type=type, so the two constraints never conflict.
ALTER TABLE "notification_preference"
  ADD CONSTRAINT "notification_preference_recipient_event_uq"
  UNIQUE ("recipient_type", "recipient_id", "event_type");
