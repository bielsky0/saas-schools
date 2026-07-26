--> HAND-WRITTEN (langlion plan Faza 22, EPIK 36, §2.34).
-->
--> Row-Level Security for interest_signup, in the same shape as
--> 0035/0026/0015/0020/0022/0024: tenant isolation on "organizationId",
--> plus the fenced system-bypass policy.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "interest_signup" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interest_signup" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "interest_signup_tenant_isolation" ON "interest_signup"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "interest_signup_system_bypass" ON "interest_signup"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
