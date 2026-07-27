--> HAND-WRITTEN (Faza 35 — SMS / broadcast do grup).
-->
--> Additive migration: two new tables, four new columns.
--> broadcast_message — ad-hoc mass messages sent by staff.
--> organization_sms_credit — per-org SMS credit balance (1:1).
--> client.sms_opt_out — broadcast opt-out flag per client.
--> notification_preference.sms_enabled — per-event-type SMS preference.
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS broadcast_message (
  id text PRIMARY KEY,
  "organizationId" text NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms', 'email')),
  audience_type text NOT NULL CHECK (audience_type IN ('group_type', 'session', 'all_clients')),
  audience_ref_id text,
  body text NOT NULL,
  recipient_count integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent')),
  sent_by_user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  sent_at timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX broadcast_message_org_idx ON broadcast_message("organizationId");

CREATE TABLE IF NOT EXISTS organization_sms_credit (
  "organizationId" text PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE client ADD COLUMN IF NOT EXISTS sms_opt_out boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE notification_preference ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT true;--> statement-breakpoint

ALTER TABLE broadcast_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_message FORCE ROW LEVEL SECURITY;
CREATE POLICY broadcast_message_tenant_isolation ON broadcast_message
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));
CREATE POLICY broadcast_message_system_bypass ON broadcast_message
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');

ALTER TABLE organization_sms_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_sms_credit FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_sms_credit_tenant_isolation ON organization_sms_credit
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));
CREATE POLICY organization_sms_credit_system_bypass ON organization_sms_credit
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
