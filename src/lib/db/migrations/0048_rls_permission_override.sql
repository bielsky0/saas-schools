--> HAND-WRITTEN (langlion plan Faza 23, EPIK 38, §2.36).
-->
--> Row-Level Security for membership_permission_override, in the same shape as
--> 0015/0046/etc: tenant isolation on "organizationId", plus the fenced
--> system-bypass policy.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "membership_permission_override" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "membership_permission_override" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "mpo_tenant_isolation" ON "membership_permission_override"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "mpo_system_bypass" ON "membership_permission_override"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
