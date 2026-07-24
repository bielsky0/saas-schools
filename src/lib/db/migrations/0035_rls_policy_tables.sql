--> HAND-WRITTEN (langlion plan Faza 17, EPIK 28, §2.18).
-->
--> Row-Level Security for policy_document and policy_acceptance, in the
--> same shape as 0026/0015/0020/0022/0024: tenant isolation on
--> "organizationId", plus the fenced system-bypass policy that
--> withSystemBypass() in src/lib/db/system.ts relies on.
-->
--> NO DATA GATE NEEDED BEFORE THESE FORCEs. Both tables are created
--> empty by 0034 in the immediately preceding migration, so "rows without
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
ALTER TABLE "policy_document" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "policy_document" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "policy_document_tenant_isolation" ON "policy_document"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "policy_document_system_bypass" ON "policy_document"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint
ALTER TABLE "policy_acceptance" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "policy_acceptance" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "policy_acceptance_tenant_isolation" ON "policy_acceptance"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "policy_acceptance_system_bypass" ON "policy_acceptance"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
