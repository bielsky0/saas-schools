-- HAND-WRITTEN (Faza 0+1 apex dashboard — setting overrides, 0.7).
--
-- `admin_client_setting_override` — a diff (+ reset) for org settings that do
-- not map to an `organization` column. GLOBAL / bypass-only.

BEGIN;--> statement-breakpoint

CREATE TABLE "admin_client_setting_override" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
  "setting_key" text NOT NULL,
  "value_json" jsonb NOT NULL,
  "default_value_json" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admin_client_setting_override_org_key_uq" UNIQUE ("organization_id", "setting_key")
);--> statement-breakpoint

ALTER TABLE "admin_client_setting_override" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_client_setting_override" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_client_setting_override_system_bypass" ON "admin_client_setting_override"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE INDEX "admin_client_setting_override_org_idx" ON "admin_client_setting_override" USING btree ("organization_id");--> statement-breakpoint

COMMIT;