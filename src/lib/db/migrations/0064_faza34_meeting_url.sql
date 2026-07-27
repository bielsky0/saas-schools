--> HAND-WRITTEN (Faza 34 — Online classes meeting URL).
-->
--> Additive migration: two new nullable columns.
--> group_type.default_meeting_url — default link for all sessions of this type.
--> class_session.meeting_url — per-session link, copied from default at
--> generation time, editable per session (analogous to location_id).
-->
--> The three-step inheritance pattern (§2.12) is resolved at generation time:
--> this is step 1 (default) and step 3 (concrete session). There is no
--> pattern-level override (no column on group_type_recurrence).
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE group_type ADD COLUMN default_meeting_url text;--> statement-breakpoint
ALTER TABLE class_session ADD COLUMN meeting_url text;
