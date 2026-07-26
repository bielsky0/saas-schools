--> HAND-WRITTEN (langlion plan Faza 27, EPIK 42, §2.41).
-->
--> Row-Level Security for extra_fee, in the same shape as
--> 0052/0050/0048/0035/0015: tenant isolation on "organization_id", plus the
--> fenced system-bypass policy.
-->
--> NO DATA GATE NEEDED BEFORE THESE FORCEs. The table is created empty by
--> 0053 in the immediately preceding migration.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "extra_fee" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "extra_fee" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "extra_fee_tenant_isolation" ON "extra_fee"
  FOR ALL TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "extra_fee_system_bypass" ON "extra_fee"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
