import { and, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { page } from "@/lib/db/schema/pages";
import { organization } from "@/lib/db/schema/organizations";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import {
  CMS_COLLECTIONS,
  getCollectionById,
  getDefaultTemplateConfig,
  getTemplateById,
  getTemplateName,
} from "@/lib/cms-collections";
import { getBlogPostBySlug } from "@/lib/block-data";
import { ORG_SUBDOMAIN_HEADER } from "@/lib/tenant-host";
import { getOrgBySubdomain } from "@/features/organizations/data";
import { resolveUniqueSlug, slugify } from "@/features/organizations/slug";
import { getActiveBuilderTheme, upsertBuilderTheme } from "@/features/cms/builder-theme-data";

// ── Response shape mapping ──────────────────────────────────────────────

function toChaiPage(row: typeof page.$inferSelect) {
  return {
    id: row.id,
    name: row.title,
    slug: row.slug,
    lang: "en",
    pageType: row.pageType,
    blocks: row.blocks ?? [],
    createdAt: row.createdAt?.toISOString() ?? "",
    lastSaved: row.updatedAt?.toISOString() ?? "",
    dynamic: false,
    online: row.status === "published",
    status: row.status,
    seo: row.seo ?? {},
    app: row.organizationId,
    primaryPage: null,
    currentEditor: null,
    changes: [],
    parent: row.parentId ?? null,
    templateId: row.templateId ?? null,
  };
}

// ── Read helpers (no write, no tenant context needed beyond orgId) ─────

async function listPages(tx: TenantDb, orgId: string) {
  return tx
    .select()
    .from(page)
    .where(eq(page.organizationId, orgId))
    .orderBy(desc(page.createdAt));
}

async function getPageById(tx: TenantDb, orgId: string, pageId: string) {
  const rows = await tx
    .select()
    .from(page)
    .where(and(eq(page.id, pageId), eq(page.organizationId, orgId)))
    .limit(1);
  return rows[0] ?? null;
}

// ── Server settings (not yet tenant-configurable) ──────────────────────

const defaultWebsiteSettings = {
  fallbackLang: "en",
  languages: ["en"],
  theme: {
    colors: {
      card: ["#FFFFFF", "#09090B"],
      ring: ["#2563EB", "#3B82F6"],
      input: ["#E4E4E7", "#27272A"],
      muted: ["#F4F4F5", "#27272A"],
      accent: ["#F4F4F5", "#27272A"],
      border: ["#E4E4E7", "#27272A"],
      popover: ["#FFFFFF", "#09090B"],
      primary: ["#2563EB", "#3B82F6"],
      secondary: ["#F4F4F5", "#27272A"],
      background: ["#FFFFFF", "#09090B"],
      foreground: ["#09090B", "#FFFFFF"],
      destructive: ["#EF4444", "#7F1D1D"],
      "card-foreground": ["#09090B", "#FFFFFF"],
      "muted-foreground": ["#71717A", "#A1A1AA"],
      "accent-foreground": ["#09090B", "#FFFFFF"],
      "popover-foreground": ["#09090B", "#FFFFFF"],
      "primary-foreground": ["#FFFFFF", "#FFFFFF"],
      "secondary-foreground": ["#09090B", "#FFFFFF"],
      "destructive-foreground": ["#FFFFFF", "#FFFFFF"],
    },
    fontFamily: { body: "Roboto", heading: "Poppins" },
    borderRadius: "30px",
  },
  appKey: "00000000-0000-4000-8000-000000000000",
  designTokens: {},
  appChanges: [],
};

const pageTypes = [
  { key: "page", name: "Page", helpText: "", icon: "", hasSlug: true },
  { key: "blog_post", name: "Blog Post", helpText: "", icon: "", hasSlug: true },
  { key: "blog_post_template", name: "Blog Template", helpText: "", icon: "", hasSlug: true },
  { key: "course_entry", name: "Course Entry", helpText: "", icon: "", hasSlug: true },
  { key: "course_template", name: "Course Template", helpText: "", icon: "", hasSlug: true },
];

/** Per-collection `postCount` + template list — shared by GET_COLLECTIONS and GET_WEBSITE_DATA. */
async function buildCollections(tx: TenantDb, organizationId: string) {
  const collectionPageTypes = CMS_COLLECTIONS.map((c) => c.pageType);
  const counts =
    collectionPageTypes.length > 0
      ? await tx
          .select({
            pageType: page.pageType,
            count: sql<number>`count(*)::int`,
          })
          .from(page)
          .where(
            and(
              eq(page.organizationId, organizationId),
              ne(page.status, "archived"),
              inArray(page.pageType, collectionPageTypes),
            ),
          )
          .groupBy(page.pageType)
      : [];
  const countByType = Object.fromEntries(counts.map((r) => [r.pageType, r.count]));
  return CMS_COLLECTIONS.map((c) => ({
    id: c.id,
    name: c.name,
    pageType: c.pageType,
    templatePageType: c.templatePageType,
    postCount: countByType[c.pageType] ?? 0,
    templates: c.templates.map((t) => ({ id: t.id, name: t.name, layout: t.layout })),
  }));
}

const emptyListActions = new Set([
  "GET_LIBRARIES",
  "GET_LANGUAGE_PAGES",
  "GET_LIBRARY_GROUPS",
  "GET_PAGE_REVISIONS",
  "SEARCH_PAGES",
  "GET_DYNAMIC_PAGES",
  "GET_TEMPLATES_BY_TYPE",
  "GET_LIBRARY_ITEMS",
  "SEARCH_PAGE_TYPE_ITEMS",
]);

// ── Route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data } = body;

    const subdomain = req.headers.get(ORG_SUBDOMAIN_HEADER);
    if (!subdomain) {
      return NextResponse.json(
        { error: "Missing organization context" },
        { status: 400 },
      );
    }

    const org = await getOrgBySubdomain(subdomain);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }
    const organizationId = org.id;

    const session = await getServerSession();
    const userId = session?.user?.id ?? null;

    return withTenant(organizationId, async (tx) => {
      switch (action) {
        // ── Read actions ────────────────────────────────────────────

        case "GET_WEBSITE_PAGES": {
          const pages = await listPages(tx, organizationId);
          return NextResponse.json(pages.map(toChaiPage));
        }

        case "GET_WEBSITE_DATA": {
          const pages = await tx
            .select()
            .from(page)
            .where(eq(page.organizationId, organizationId))
            .orderBy(desc(page.createdAt));

          const orgRow = await db
            .select()
            .from(organization)
            .where(eq(organization.id, organizationId))
            .limit(1);

          const builderTheme = await getActiveBuilderTheme(tx, organizationId);
          const websiteSettings = builderTheme
            ? { ...defaultWebsiteSettings, theme: builderTheme }
            : defaultWebsiteSettings;

          return NextResponse.json({
            websiteSettings,
            websitePages: pages.map(toChaiPage),
            pageTypes,
            libraries: [],
            collections: await buildCollections(tx, organizationId),
            // UI locale for the editor chrome. Tenant-level default for now; a
            // per-organization `locale` column should flow through here later.
            uiLocale: "pl",
            role: session ? "admin" : "guest",
            settings: orgRow[0] ?? { name: "Akademia", currency: "PLN" },
          });
        }

        case "GET_WEBSITE_SETTINGS":
        case "GET_WEBSITE_DRAFT_SETTINGS": {
          const builderTheme = await getActiveBuilderTheme(tx, organizationId);
          const websiteSettings = builderTheme
            ? { ...defaultWebsiteSettings, theme: builderTheme }
            : defaultWebsiteSettings;
          return NextResponse.json(websiteSettings);
        }

        case "GET_DRAFT_PAGE": {
          if (!data?.id) {
            return NextResponse.json(null);
          }
          const p = await getPageById(tx, organizationId, data.id);
          if (!p) return NextResponse.json(null);
          return NextResponse.json(toChaiPage(p));
        }

        case "GET_PAGE_ALL_DATA": {
          let draftPage = null;
          if (data?.id) {
            const row = await getPageById(tx, organizationId, data.id);
            if (row) draftPage = toChaiPage(row);
          }
          return NextResponse.json({
            draftPage,
            builderPageData: { global: {} },
            languagePages: [],
          });
        }

        case "GET_BUILDER_PAGE_DATA": {
          const { pageType, pageProps } = data;
          let blogData = null;

          if (pageType === "blog_post" && pageProps?.slug) {
            const slug = pageProps.slug.replace(/^\//, "");
            const post = await getBlogPostBySlug(tx, organizationId, slug);
            if (post) {
              const seo = (post.seo ?? {}) as Record<string, string>;
              blogData = {
                title: post.title,
                description: seo.description || "",
                image: seo.ogImage || "",
                url: `/${slug}`,
                datePublished: post.publishedAt?.toISOString() ?? new Date().toISOString(),
              };
            }
          }

          return NextResponse.json({
            global: {},
            ...(blogData ? { blog: blogData } : {}),
          });
        }

        case "GET_PAGE_TYPES":
          return NextResponse.json(pageTypes);

        case "GET_COLLECTIONS": {
          return NextResponse.json({
            collections: await buildCollections(tx, organizationId),
          });
        }

        case "LIST_COLLECTION_ITEMS": {
          const collection = getCollectionById(data?.collectionId);
          if (!collection) {
            return NextResponse.json(
              { error: "Collection not found" },
              { status: 404 },
            );
          }
          const conds = [
            eq(page.organizationId, organizationId),
            eq(page.pageType, collection.pageType),
            ne(page.status, "archived"),
          ];
          if (data?.search) {
            conds.push(ilike(page.title, `%${String(data.search)}%`));
          }
          if (data?.draftsOnly) {
            conds.push(eq(page.status, "draft"));
          }
          const rows = await tx
            .select()
            .from(page)
            .where(and(...conds))
            .orderBy(desc(page.createdAt));
          const items = rows.map((r) => ({
            id: r.id,
            title: r.title,
            slug: r.slug,
            templateId: r.templateId,
            templateName: getTemplateName(collection.id, r.templateId),
            status: r.status,
            createdAt: r.createdAt?.toISOString() ?? "",
          }));
          return NextResponse.json({ items });
        }

        case "GET_TEMPLATE_DATA": {
          const collection = getCollectionById(data?.collectionId);
          const template = getTemplateById(data?.collectionId, data?.templateId);
          if (!collection || !template) {
            return NextResponse.json(
              { error: "Template not found" },
              { status: 404 },
            );
          }
          const [tplPage] = await tx
            .select()
            .from(page)
            .where(
              and(
                eq(page.organizationId, organizationId),
                eq(page.pageType, collection.templatePageType),
                eq(page.slug, template.id),
              ),
            )
            .limit(1);
          return NextResponse.json({
            page: tplPage ? toChaiPage(tplPage) : null,
            config: tplPage?.templateConfig ?? getDefaultTemplateConfig(template),
          });
        }

        case "GET_SITE_WIDE_USAGE":
        case "GET_BLOCK_ASYNC_PROPS":
        case "GET_COMPARE_DATA":
          return NextResponse.json({});

        case "GET_CHANGES":
          return NextResponse.json({ changes: [] });

        // ── Auth ─────────────────────────────────────────────────────

        case "CHECK_USER_ACCESS":
          return NextResponse.json({
            access: Boolean(session),
            role: session ? "admin" : "guest",
            permissions: null,
          });

        // ── Mutations ────────────────────────────────────────────────

        case "CREATE_PAGE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const name = data?.name || "New Page";
          const slug = data?.slug ?? slugify(name);
          const newPage = await tx
            .insert(page)
            .values({
              organizationId,
              slug,
              title: name,
              pageType: data?.pageType || "page",
              parentId: data?.parent || null,
              blocks: [],
              status: "draft",
              isHome: slug === "",
              createdByUserId: userId,
            })
            .returning();
          return NextResponse.json({ page: toChaiPage(newPage[0]!) });
        }

        case "CREATE_COLLECTION_ITEM": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = getCollectionById(data?.collectionId);
          const template = getTemplateById(data?.collectionId, data?.templateId);
          if (!collection || !template) {
            return NextResponse.json(
              { error: "Collection or template not found" },
              { status: 404 },
            );
          }
          if (template.collectionId !== collection.id) {
            return NextResponse.json(
              { error: "Template does not belong to collection" },
              { status: 400 },
            );
          }
          const title = String(data?.title ?? "Nowy wpis");
          const desiredSlug = data?.slug ? String(data.slug) : slugify(title);
          const slug = await resolveUniqueSlug(desiredSlug, async (s) => {
            const existing = await tx
              .select({ id: page.id })
              .from(page)
              .where(and(eq(page.organizationId, organizationId), eq(page.slug, s)))
              .limit(1);
            return existing.length > 0;
          });
          const newPage = await tx
            .insert(page)
            .values({
              organizationId,
              slug,
              title,
              pageType: collection.pageType,
              templateId: template.id,
              blocks: [],
              status: "draft",
              isHome: false,
              createdByUserId: userId,
            })
            .returning();
          return NextResponse.json({ page: toChaiPage(newPage[0]!) });
        }

        case "UPDATE_TEMPLATE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = getCollectionById(data?.collectionId);
          const template = getTemplateById(data?.collectionId, data?.templateId);
          if (!collection || !template) {
            return NextResponse.json(
              { error: "Template not found" },
              { status: 404 },
            );
          }
          const [existing] = await tx
            .select()
            .from(page)
            .where(
              and(
                eq(page.organizationId, organizationId),
                eq(page.pageType, collection.templatePageType),
                eq(page.slug, template.id),
              ),
            )
            .limit(1);
          const set: Partial<typeof page.$inferInsert> = { updatedAt: new Date() };
          if (data?.blocks !== undefined) set.blocks = data.blocks;
          if (data?.config !== undefined) set.templateConfig = data.config;
          if (existing) {
            await tx.update(page).set(set).where(eq(page.id, existing.id));
          } else {
            await tx
              .insert(page)
              .values({
                organizationId,
                slug: template.id,
                title: template.name,
                pageType: collection.templatePageType,
                blocks: data?.blocks ?? [],
                templateConfig: data?.config ?? null,
                status: "draft",
                isHome: false,
                createdByUserId: userId,
                updatedAt: new Date(),
              })
              .returning();
          }
          return NextResponse.json({ success: true });
        }

        case "UPDATE_PAGE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          if (!data?.id) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const existing = await getPageById(tx, organizationId, data.id);
          if (!existing) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          const newSlug = data.slug ?? existing.slug;
          const updated = await tx
            .update(page)
            .set({
              blocks: data.blocks ?? existing.blocks,
              title: data.name ?? existing.title,
              slug: newSlug,
              seo: data.seo ?? existing.seo,
              pageType: data.pageType ?? existing.pageType,
              isHome: newSlug === "",
              updatedAt: new Date(),
            })
            .where(and(eq(page.id, data.id), eq(page.organizationId, organizationId)))
            .returning();
          return NextResponse.json({ page: toChaiPage(updated[0]!) });
        }

        case "UPDATE_PAGE_METADATA": {
          if (!data?.id) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const existing = await getPageById(tx, organizationId, data.id);
          if (!existing) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          const newSlug = data.slug ?? existing.slug;
          await tx
            .update(page)
            .set({
              title: data.name ?? existing.title,
              slug: newSlug,
              seo: data.seo ?? existing.seo,
              isHome: newSlug === "",
              updatedAt: new Date(),
            })
            .where(and(eq(page.id, data.id), eq(page.organizationId, organizationId)));
          return NextResponse.json({ success: true });
        }

        case "DELETE_PAGE": {
          if (!data?.id) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const deleted = await tx
            .update(page)
            .set({ status: "archived", updatedAt: new Date() })
            .where(and(eq(page.id, data.id), eq(page.organizationId, organizationId)))
            .returning({ id: page.id });
          if (!deleted.length) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          return NextResponse.json({ tags: [] });
        }

        case "DUPLICATE_PAGE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const pageId = data?.pageId || data?.id;
          if (!pageId) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const original = await getPageById(tx, organizationId, pageId);
          if (!original) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          const newName = data?.name || `${original.title} (Copy)`;
          const copy = await tx
            .insert(page)
            .values({
              organizationId,
              slug: slugify(newName),
              title: newName,
              pageType: original.pageType,
              parentId: original.parentId,
              blocks: original.blocks,
              seo: original.seo,
              status: "draft",
              createdByUserId: userId,
            })
            .returning();
          return NextResponse.json({ id: copy[0]!.id });
        }

        case "TAKE_OFFLINE": {
          if (!data?.id) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const updated = await tx
            .update(page)
            .set({ status: "archived", updatedAt: new Date() })
            .where(and(eq(page.id, data.id), eq(page.organizationId, organizationId)))
            .returning();
          if (!updated.length) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          return NextResponse.json({
            tags: [],
            page: toChaiPage(updated[0]!),
          });
        }

        case "MARK_AS_TEMPLATE": {
          if (!data?.id) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const updated = await tx
            .update(page)
            .set({ pageType: "template", updatedAt: new Date() })
            .where(and(eq(page.id, data.id), eq(page.organizationId, organizationId)))
            .returning();
          if (!updated.length) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          return NextResponse.json({ page: toChaiPage(updated[0]!) });
        }

        case "UNMARK_AS_TEMPLATE": {
          if (!data?.id) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const updated = await tx
            .update(page)
            .set({ pageType: "page", updatedAt: new Date() })
            .where(and(eq(page.id, data.id), eq(page.organizationId, organizationId)))
            .returning();
          if (!updated.length) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          return NextResponse.json({ success: true });
        }

        case "PUBLISH_CHANGES": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const pageId = data?.id ?? data?.ids?.[0];
          if (!pageId) {
            return NextResponse.json(
              { error: "Missing page id" },
              { status: 400 },
            );
          }
          const updated = await tx
            .update(page)
            .set({
              status: "published",
              publishedAt: new Date(),
              publishedByUserId: userId,
              updatedAt: new Date(),
            })
            .where(and(eq(page.id, pageId), eq(page.organizationId, organizationId)))
            .returning();
          if (!updated.length) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          return NextResponse.json({ page: toChaiPage(updated[0]!) });
        }

        // ── Mocks / still-unimplemented ─────────────────────────────

        case "RESTORE_PAGE_REVISION":
          return NextResponse.json({
            success: true,
            pageId: data?.pageId ?? null,
          });

        case "UPSERT_LIBRARY_ITEM":
          return NextResponse.json({
            id: crypto.randomUUID(),
            name: data?.name ?? null,
            blocks: {},
            library: null,
            description: null,
            group: null,
            user: null,
            preview: null,
            type: null,
            createdAt: new Date().toISOString(),
            html: null,
          });

        case "DELETE_LIBRARY_ITEM":
        case "DELETE_PAGE_REVISION":
          return NextResponse.json({ success: true });

        case "UPDATE_WEBSITE_FIELDS": {
          const theme = data?.settings?.theme;
          if (theme) {
            await upsertBuilderTheme(tx, organizationId, theme, userId);
          }
          return NextResponse.json({ success: true });
        }

        case "ASK_AI":
        case "GENERATE_HTML_FROM_PROMPT":
          return NextResponse.json({ textStream: null });

        case "GENERATE_SEO_FIELD":
          return NextResponse.json({ text: "" });

        default:
          break;
      }

      if (emptyListActions.has(action)) return NextResponse.json([]);
      return NextResponse.json({});
    });
  } catch (error) {
    console.error("[editor/api]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
