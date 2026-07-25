--> HAND-WRITTEN (langlion plan Faza 21, EPIK 33, §2.31).
-->
--> Row-Level Security for client_price_override, in the same shape as
--> 0015/0041: tenant isolation on "organizationId", plus the fenced
--> system-bypass policy that withSystemBypass() in src/lib/db/system.ts
--> relies on.
-->
--> NO DATA GATE NEEDED. The table is created empty by 0042 in the
--> immediately preceding migration, so "rows without an owner" cannot
--> be a non-zero answer here.
-->
--> INVISIBLE TO DRIZZLE, like every *rls_* migration: policies have
--> no TS representation, so `generate` will never propose dropping
--> them and `push` (banned repo-wide) would.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "client_price_override" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "client_price_override" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "client_price_override_tenant_isolation" ON "client_price_override"
  FOR ALL TO saas_school
  USING ("organizationId" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "client_price_override_system_bypass" ON "client_price_override"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
