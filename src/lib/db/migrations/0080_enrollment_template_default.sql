-- HAND-WRITTEN (mvp-plan F2 — enrollment template selection + default template).
--
-- 1) Adds `group_type.enrollmentTemplateId` — the `enrollment_template` layout
--    a group type's landing page (`/zapisy/{slug}`) renders with. Nullable,
--    no FK (template keys are shared across tenants, like `page.templateId`):
--    null means "use the org's default template".
-- 2) Seeds the DEFAULT enrollment template page for every existing org that has
--    the `enrollments` collection, so each group ALWAYS has an out-of-the-box
--    landing layout. Mirrors the `createOrganizationAction` seed for new orgs.
--    Identity: (organizationId, pageType = enrollment_template, slug =
--    tpl-enrollment-default) — the same identity GET_TEMPLATE_DATA/UPDATE_TEMPLATE
--    use, so editing "Domyślny" in the builder updates this very row.
--
-- The seeded blocks match `buildDefaultEnrollmentTemplateBlocks()` in
-- src/lib/enrollment-blocks.ts (stable `_id`s for readability).

BEGIN;--> statement-breakpoint

-- ── group_type.enrollmentTemplateId ──────────────────────────────────────

ALTER TABLE "group_type" ADD COLUMN "enrollmentTemplateId" text;--> statement-breakpoint

-- ── Seed default enrollment template page for existing orgs ──────────────

DO $$
DECLARE
  org RECORD;
  has_collection BOOLEAN;
BEGIN
  FOR org IN SELECT id FROM organization LOOP
    SELECT EXISTS (
      SELECT 1 FROM cms_collection
      WHERE "organizationId" = org.id AND key = 'enrollments'
    ) INTO has_collection;

    IF has_collection THEN
      INSERT INTO page ("id", "organizationId", "slug", "title", "blocks", "status", "isHome", "pageType", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), org.id, 'tpl-enrollment-default', 'Domyślny szablon zapisów',
        '[{"_id":"enroll-default-root","_type":"Box","_parent":null,"styles":"#styles:,flex flex-col gap-6 p-6","tag":"div"},{"_id":"enroll-default-hero","_type":"EnrollmentHero","_parent":"enroll-default-root","showPrice":true,"showDescription":true,"ctaLabel":"Przejdź do zapisu","ctaHref":"#booking","styles":"#styles:,"},{"_id":"enroll-default-schedule","_type":"EnrollmentSchedule","_parent":"enroll-default-root","limit":5,"showTrainer":true,"showLocation":true,"styles":"#styles:,"},{"_id":"enroll-default-pricing","_type":"EnrollmentPricing","_parent":"enroll-default-root","showSinglePrice":true,"showPackages":true,"styles":"#styles:,"},{"_id":"enroll-default-instructors","_type":"EnrollmentInstructors","_parent":"enroll-default-root","limit":4,"styles":"#styles:,"},{"_id":"enroll-default-policy","_type":"EnrollmentPolicy","_parent":"enroll-default-root","showConsents":true,"styles":"#styles:,"},{"_id":"enroll-default-flow","_type":"EnrollmentBookingFlow","_parent":"enroll-default-root","anchorId":"booking","styles":"#styles:,"}]'::jsonb,
        'draft', false, 'enrollment_template', now(), now()
      WHERE NOT EXISTS (
        SELECT 1 FROM page
        WHERE "organizationId" = org.id AND "slug" = 'tpl-enrollment-default'
      );
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

COMMIT;