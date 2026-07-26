--> HAND-WRITTEN (langlion plan Faza 24, EPIK 37, §2.35).
-->
--> Row-Level Security for consent_document and athlete_consent, in the same
--> shape as 0035/0048/0015: tenant isolation on "organizationId", plus the
--> fenced system-bypass policy.
-->
--> NO DATA GATE NEEDED BEFORE THESE FORCEs. Both tables are created empty by
--> 0049 in the immediately preceding migration.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "consent_document" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consent_document" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "consent_document_tenant_isolation" ON "consent_document"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "consent_document_system_bypass" ON "consent_document"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint
ALTER TABLE "athlete_consent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "athlete_consent" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "athlete_consent_tenant_isolation" ON "athlete_consent"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "athlete_consent_system_bypass" ON "athlete_consent"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
