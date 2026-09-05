-- HAND-WRITTEN (Faza 0+1 apex dashboard — feature flags, 0.3–0.4).
--
-- Dictionary (`admin_feature_flag`) + per-scope overrides (`admin_feature_flag_value`).
-- GLOBAL / bypass-only (no permissive SELECT — same posture as 0085). The
-- inheritance engine is src/features/admin/flags.ts.

BEGIN;--> statement-breakpoint

CREATE TABLE "admin_feature_flag" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "description" text,
  "enabled_global" boolean DEFAULT false NOT NULL,
  "condition" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "admin_feature_flag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_feature_flag" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_feature_flag_system_bypass" ON "admin_feature_flag"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE TABLE "admin_feature_flag_value" (
  "id" text PRIMARY KEY NOT NULL,
  "feature_key" text NOT NULL REFERENCES "public"."admin_feature_flag"("key") ON DELETE cascade,
  "scope" text NOT NULL,
  "scope_id" text NOT NULL,
  "enabled" boolean NOT NULL,
  CONSTRAINT "admin_feature_flag_value_scope_uq" UNIQUE ("feature_key", "scope", "scope_id")
);--> statement-breakpoint

ALTER TABLE "admin_feature_flag_value" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_feature_flag_value" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_feature_flag_value_system_bypass" ON "admin_feature_flag_value"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE INDEX "admin_feature_flag_value_feature_idx" ON "admin_feature_flag_value" USING btree ("feature_key");--> statement-breakpoint
CREATE INDEX "admin_feature_flag_value_scope_idx" ON "admin_feature_flag_value" USING btree ("scope", "scope_id");--> statement-breakpoint

COMMIT;