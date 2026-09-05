-- HAND-WRITTEN (Faza 0+1 apex dashboard — fix latent RLS bug from 0028).
--
-- 0028_faza9_plans_limits.sql gated every WRITE policy on the GUC
-- `app.is_system_bypass = 'true'`, but the application never sets that GUC —
-- withSystemBypass() (src/lib/db/system.ts) sets `app.bypass_rls = 'on'`, the
-- same GUC every other policy in this repo uses (0015–0017, 0069). The result:
-- for the non-owner app role `saas_school`, every INSERT/UPDATE/DELETE from the
-- super-admin plans/limits screens is blocked by RLS (and the matching SELECT
-- returns nothing), i.e. `upsertOrgOverrideAction` etc. silently do nothing.
--
-- This migration rewrites the four `*_system_bypass` policies onto the correct
-- `app.bypass_rls` GUC. It does NOT touch `*_select_all` (permissive reads for
-- tenant runtime) nor `organization_limit_override_tenant_isolation`.

BEGIN;--> statement-breakpoint

--
-- plan
--
DROP POLICY IF EXISTS "plan_system_bypass" ON "plan";--> statement-breakpoint
CREATE POLICY "plan_system_bypass" ON "plan"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

--
-- plan_limit_definition
--
DROP POLICY IF EXISTS "plan_limit_definition_system_bypass" ON "plan_limit_definition";--> statement-breakpoint
CREATE POLICY "plan_limit_definition_system_bypass" ON "plan_limit_definition"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

--
-- plan_feature_flag
--
DROP POLICY IF EXISTS "plan_feature_flag_system_bypass" ON "plan_feature_flag";--> statement-breakpoint
CREATE POLICY "plan_feature_flag_system_bypass" ON "plan_feature_flag"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint

--
-- organization_limit_override
--
DROP POLICY IF EXISTS "organization_limit_override_system_bypass" ON "organization_limit_override";--> statement-breakpoint
CREATE POLICY "organization_limit_override_system_bypass" ON "organization_limit_override"
  FOR ALL TO saas_school
  USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on')
  WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on');--> statement-breakpoint
-- Second half of the same latent bug: the tenant policy reads
-- `current_setting('app.organization_id')` WITHOUT a missing_ok flag, so a
-- connection that has not set that GUC (every super-admin transaction) raises
-- 42704 while evaluating the policy — even when the bypass policy would have
-- allowed the row. Aligned onto the canonical 0015 idiom
-- (`nullif(current_setting(..., true), '')`).
DROP POLICY IF EXISTS "organization_limit_override_tenant_isolation" ON "organization_limit_override";--> statement-breakpoint
CREATE POLICY "organization_limit_override_tenant_isolation" ON "organization_limit_override"
  FOR ALL TO saas_school
  USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
  WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''));--> statement-breakpoint

COMMIT;