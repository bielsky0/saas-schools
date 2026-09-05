-- HAND-WRITTEN (Faza 0+1 apex dashboard — client groups, 0.1–0.2).
--
-- Cross-tenant grouping of organizations. NEW GLOBAL tables follow the
-- corrected bypass_rls pattern (0015/0069, NOT the buggy 0028 GUC). There is
-- deliberately NO permissive SELECT policy: these rows are cross-tenant, so a
-- tenant session must not read them. Reads and writes both go through
-- withSystemBypass() only — fail-closed (0.13 RLS test relies on this).

BEGIN;--> statement-breakpoint

CREATE TABLE "admin_client_group" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "admin_client_group" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_client_group" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_client_group_system_bypass" ON "admin_client_group"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE TABLE "admin_client_group_member" (
  "id" text PRIMARY KEY NOT NULL,
  "group_id" text NOT NULL REFERENCES "public"."admin_client_group"("id") ON DELETE cascade,
  "organization_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
  "added_by_user_id" text NOT NULL REFERENCES "public"."user"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "admin_client_group_member_group_org_uq" UNIQUE ("group_id", "organization_id")
);--> statement-breakpoint

ALTER TABLE "admin_client_group_member" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_client_group_member" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "admin_client_group_member_system_bypass" ON "admin_client_group_member"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

CREATE INDEX "admin_client_group_member_org_idx" ON "admin_client_group_member" USING btree ("organization_id");--> statement-breakpoint

COMMIT;