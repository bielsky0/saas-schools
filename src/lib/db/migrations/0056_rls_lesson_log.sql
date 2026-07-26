--> HAND-WRITTEN (langlion plan Faza 28, EPIK 43, §2.42).
-->
--> Row-Level Security for lesson_topic, homework, homework_completion,
--> in the same shape as 0054/0052/0050/0048/0035/0015: tenant isolation
--> on "organization_id" (or "organizationId" for camelCase tables), plus
--> the fenced system-bypass policy.
-->
--> NO DATA GATE NEEDED BEFORE THESE FORCEs.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "lesson_topic" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lesson_topic" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "lesson_topic_tenant_isolation" ON "lesson_topic"
  FOR ALL TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "lesson_topic_system_bypass" ON "lesson_topic"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

ALTER TABLE "homework" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "homework" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "homework_tenant_isolation" ON "homework"
  FOR ALL TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "homework_system_bypass" ON "homework"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

ALTER TABLE "homework_completion" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "homework_completion" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "homework_completion_tenant_isolation" ON "homework_completion"
  FOR ALL TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "homework_completion_system_bypass" ON "homework_completion"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
