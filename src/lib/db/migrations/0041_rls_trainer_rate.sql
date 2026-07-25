--> HAND-WRITTEN (langlion plan Faza 20, EPIK 32, §2.30).
-->
--> Row-Level Security for trainer_rate, in the same shape as
--> 0015/0020/0022/0024/0026/0035/0037: tenant isolation on
--> "organizationId", plus the fenced system-bypass policy that
--> withSystemBypass() in src/lib/db/system.ts relies on.
-->
--> NO DATA GATE NEEDED BEFORE THESE FORCEs. The table is created
--> empty by 0040 in the immediately preceding migration, so "rows without
--> an owner" cannot be a non-zero answer here.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration: policies have no TS
--> representation, so `generate` will never propose dropping them and
--> `push` (banned repo-wide) would.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "trainer_rate" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trainer_rate" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "trainer_rate_tenant_isolation" ON "trainer_rate"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "trainer_rate_system_bypass" ON "trainer_rate"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
