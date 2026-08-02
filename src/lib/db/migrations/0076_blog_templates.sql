--> HAND-WRITTEN (blog-templates-cms, Faza 1 — post → layout-template relation).
-->
--> `page.templateId` links a collection entry (blog_post / course_entry) to its
--> layout template. The value is the static CMS template KEY from
--> src/lib/cms-collections.ts ("tpl-blog-classic"), NOT a page.id — deliberately
--> NO FK to page(id). The keys are stable identifiers shared across tenants, and
--> the template PAGES themselves (pageType = *_template) are created lazily
--> per-organization (F4 / UPDATE_TEMPLATE), so a global FK would block
--> CREATE_COLLECTION_ITEM before any template page row exists. Cross-tenant
--> integrity is enforced at the API layer by validating the key against
--> CMS_COLLECTIONS inside the same tenant transaction (deviation from F1 spec's
--> FK — recorded in docs/blog-templates-cms/01-backend.md).
-->
--> `page.templateConfig` is the layout config JSONB for template pages:
--> { layout, elements, dataMapping, seoDefaults }.
ALTER TABLE "page" ADD COLUMN "templateId" text;
ALTER TABLE "page" ADD COLUMN "templateConfig" jsonb;
CREATE INDEX "page_template_id_idx" ON "page" ("templateId");
