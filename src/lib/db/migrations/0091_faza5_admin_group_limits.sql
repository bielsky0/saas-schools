-- HAND-WRITTEN (Faza 5 — group limit overrides, apex-dashboard-plan §5.1).
--
-- NEW GLOBAL table for numeric limit overrides scoped to client groups.
-- Follows the bypass-only RLS pattern (0085–0089). No permissive SELECT:
-- reads through withSystemBypass only. `limit_value` NULL = unlimited
-- (explicit, matching organization_limit_override convention).
-- Unique on (group_id, limit_key) ensures one override per group per key.

BEGIN;--> statement-breakpoint

CREATE TABLE "admin_client_group_limit_value" (
  "id" text PRIMARY KEY NOT NULL,
  "group_id" text NOT NULL REFERENCES "public"."admin_client_group"("id") ON DELETE cascade,
  "limit_key" text NOT NULL,
  "limit_value" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admin_client_group_limit_value_group_key_uq" UNIQUE ("group_id", "limit_key")
);--> statement-breakpoint

ALTER TABLE "admin_client_group_limit_value" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_client_group_limit_value" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_client_group_limit_value_system_bypass" ON "admin_client_group_limit_value"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE INDEX "admin_client_group_limit_value_group_idx" ON "admin_client_group_limit_value" USING btree ("group_id");--> statement-breakpoint

COMMIT;
