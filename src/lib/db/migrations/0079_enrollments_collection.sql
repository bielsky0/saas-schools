-- HAND-WRITTEN (mvp-plan F2 — enrollment collection).
--
-- Seeds the "enrollments" CMS collection into every existing organization so
-- tenant enrollment pages (enrollment_detail / enrollment_template) can be
-- edited in the ChaiBuilder editor. Mirrors migration 0077's seed pattern for
-- the "blog" / "courses" collections: the static entry lives in
-- `DEFAULT_CMS_COLLECTIONS` (src/lib/db/schema/cms-collections.ts), which new
-- organizations get from `createOrganizationAction`; this migration backfills
-- the table for orgs created before the collection existed.
--
-- No table or column changes — only the seed row per org. Runs before RLS is
-- enabled is not needed here (the table already exists with RLS); the owner
-- migration connection bypasses RLS policies anyway.

BEGIN;--> statement-breakpoint

-- Seed existing tenants with the "enrollments" collection.
DO $$
DECLARE
  org RECORD;
  next_pos INTEGER;
BEGIN
  FOR org IN SELECT id FROM organization LOOP
    SELECT COALESCE(MAX(position), -1) + 1 INTO next_pos
      FROM cms_collection WHERE "organizationId" = org.id;

    INSERT INTO cms_collection ("id", "organizationId", "key", "name", "pageType", "templatePageType", "templates", "position")
    VALUES
      (gen_random_uuid(), org.id, 'enrollments', 'Zapis na zajęcia', 'enrollment_detail', 'enrollment_template',
       '[{"id":"tpl-enrollment-default","name":"Domyślny","collectionId":"enrollments","layout":"single"}]'::jsonb,
       next_pos);
  END LOOP;
END $$;--> statement-breakpoint

COMMIT;