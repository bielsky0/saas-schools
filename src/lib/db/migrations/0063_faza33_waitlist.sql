--> HAND-WRITTEN (Faza 33 — Waitlist: table + group_type flag).
-->
--> Additive migration: new table waitlist_entry, new column
--> group_type.waitlist_enabled.
-->
--> Waitlist_entry tracks parents queued for a full session. The queue is FIFO
--> by created_at; position is computed at read time via ROW_NUMBER(), never
--> stored. No RLS policies are created — the table follows the standard
--> withTenant pattern and the application scopes every query by organizationId.
--> RLS will be added in a follow-up migration (0064).
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS waitlist_entry (
  id text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  "sessionId" text NOT NULL,
  "clientId" text NOT NULL,
  "athleteId" text NOT NULL,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'offered', 'expired', 'converted', 'cancelled')),
  "offeredAt" timestamptz,
  "offerExpiresAt" timestamptz,
  "resultingBookingId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX waitlist_entry_id_org_uq ON waitlist_entry (id, "organizationId");--> statement-breakpoint
CREATE UNIQUE INDEX waitlist_entry_session_athlete_uq ON waitlist_entry ("sessionId", "athleteId");--> statement-breakpoint
CREATE INDEX waitlist_entry_org_idx ON waitlist_entry ("organizationId");--> statement-breakpoint
CREATE INDEX waitlist_entry_session_idx ON waitlist_entry ("sessionId");--> statement-breakpoint
CREATE INDEX waitlist_entry_session_status_idx ON waitlist_entry ("sessionId", status);--> statement-breakpoint
ALTER TABLE waitlist_entry ADD CONSTRAINT waitlist_entry_session_fk
  FOREIGN KEY ("sessionId", "organizationId")
  REFERENCES class_session(id, "organizationId")
  ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE waitlist_entry ADD CONSTRAINT waitlist_entry_client_fk
  FOREIGN KEY ("clientId", "organizationId")
  REFERENCES client(id, "organizationId")
  ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE waitlist_entry ADD CONSTRAINT waitlist_entry_athlete_fk
  FOREIGN KEY ("athleteId", "organizationId")
  REFERENCES athlete(id, "organizationId")
  ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE waitlist_entry ADD CONSTRAINT waitlist_entry_booking_fk
  FOREIGN KEY ("resultingBookingId", "organizationId")
  REFERENCES booking(id, "organizationId")
  ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE group_type ADD COLUMN waitlist_enabled boolean NOT NULL DEFAULT false;--> statement-breakpoint
--> Now enable RLS on waitlist_entry.
ALTER TABLE waitlist_entry ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE waitlist_entry FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "waitlist_entry_tenant_isolation" ON waitlist_entry
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "waitlist_entry_system_bypass" ON waitlist_entry
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
