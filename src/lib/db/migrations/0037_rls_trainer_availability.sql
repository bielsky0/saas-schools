--> HAND-WRITTEN (langlion plan Faza 17.5, EPIK 34, §2.32).
-->
--> Row-Level Security for trainer_availability, same shape as every
--> *rls_* migration before it (0035/0026/0015/0020/0022/0024):
--> tenant isolation on "organizationId" + fenced system-bypass policy.
-->
--> NO DATA GATE NEEDED. trainer_availability is created in 0036 (the
--> immediately preceding migration) and starts empty.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "trainer_availability" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trainer_availability" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "trainer_availability_tenant_isolation" ON "trainer_availability"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "trainer_availability_system_bypass" ON "trainer_availability"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
