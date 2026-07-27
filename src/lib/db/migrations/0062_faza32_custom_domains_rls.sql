--> HAND-WRITTEN (Faza 32 — Custom Domains: RLS).
-->
--> Row-Level Security na tabeli custom_domain. Standardowy wzorzec z migracji 0015:
--> FORCE RLS + polityka tenant_isolation + polityka system_bypass.
-->
--> Polityka tenant_isolation chroni SELECT, INSERT, UPDATE, DELETE — to jest nasza
--> własna tabela Drizzle, odpytywana przez withTenant, który ustawia GUC w tej samej
--> transakcji, więc RLS na SELECT działa i stanowi drugą linię obrony przed
--> zapomnianym WHERE organization_id = ? w DAL (US-1.1/AC1).
-->
--> FORCE RLS (nie tylko ENABLE) — zamyka lukę dla właściciela tabeli.
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'saas_school') THEN
    RAISE EXCEPTION 'role "saas_school" is missing — see docs/ARCHITECTURE.md "Two database URLs (RLS)"';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE custom_domain ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE custom_domain FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "custom_domain_tenant_isolation" ON custom_domain
  FOR ALL TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint
CREATE POLICY "custom_domain_system_bypass" ON custom_domain
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');
