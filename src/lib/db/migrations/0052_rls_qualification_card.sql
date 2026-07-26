--> HAND-WRITTEN (langlion plan Faza 26, EPIK 41, §2.40).
-->
--> Row-Level Security for qualification_card, in the same shape as
--> 0050/0048/0035/0015: tenant isolation on "organizationId", plus the
--> fenced system-bypass policy.
-->
--> NO DATA GATE NEEDED BEFORE THESE FORCEs. The table is created empty by
--> 0051 in the immediately preceding migration.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "qualification_card" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "qualification_card" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "qualification_card_tenant_isolation" ON "qualification_card"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "qualification_card_system_bypass" ON "qualification_card"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
