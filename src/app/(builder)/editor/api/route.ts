import { and, desc, eq, ilike, inArray, ne, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { initChaiBuilderActionHandler } from "@chaibuilder/sdk/actions";

import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { page } from "@/lib/db/schema/pages";
import { cmsCollection } from "@/lib/db/schema/cms-collections";
import { organization } from "@/lib/db/schema/organizations";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import {
  getCollectionByKey,
  getCollectionByPageType,
  getDefaultTemplateConfig,
  getTemplateNameOf,
  getTemplateOf,
  listCollections,
  DEFAULT_CMS_COLLECTIONS,
} from "@/lib/cms-collection-data";
import { ORG_SUBDOMAIN_HEADER } from "@/lib/tenant-host";
import { getOrgBySubdomain } from "@/features/organizations/data";
import { resolveUniqueSlug, slugify } from "@/features/organizations/slug";
import {
  getActiveBuilderThemeAndTokens,
  upsertBuilderComponentTokens,
  upsertBuilderTheme,
} from "@/features/cms/builder-theme-data";
import { getBlogPost } from "@/features/blog/data";
import { getGroupType, listGroupTypes } from "@/features/groups/data";
import { getEnrollmentPreviewForGroup } from "@/lib/enrollment-data";
import { registerBuilderProviders } from "@/features/cms/builder-providers";
import { getChaiGlobalData } from "@chaibuilder/sdk/runtime";
import {
  isDeletableSystemPage,
  isSystemPageTypeKey,
  SYSTEM_PAGE_TYPE_KEYS,
  SYSTEM_PAGE_TYPE_NAMES,
} from "@/lib/system-pages";

// ── Builder data providers (data-binding) ───────────────────────────────

registerBuilderProviders();

// ── Validation constants (F2.5) ─────────────────────────────────────────

const COLLECTION_KEY_RE = /^[a-z0-9_-]+$/;
const MAX_TEMPLATES_PER_COLLECTION = 10;

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
    pageContent: row.pageContent ?? null,
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

/** Build the page-type list from a tenant's collections (F2.5) + system pages. */
function buildPageTypes(
  collections: { pageType: string; templatePageType: string; name: string }[],
) {
  const types: {
    key: string;
    name: string;
    helpText: string;
    icon: string;
    hasSlug: boolean;
    isSystem?: boolean;
  }[] = collections.flatMap((c) => [
    { key: c.pageType, name: c.name, helpText: "", icon: "", hasSlug: true },
    { key: c.templatePageType, name: `${c.name} Template`, helpText: "", icon: "", hasSlug: true },
  ]);
  types.unshift({ key: "page", name: "Page", helpText: "", icon: "", hasSlug: true });
  types.push({
    key: "blog_index",
    name: "Blog Index",
    helpText: "",
    icon: "",
    hasSlug: true,
  });
  types.push({
    key: "enrollment_listing",
    name: "Lista zapisów",
    helpText: "",
    icon: "",
    hasSlug: true,
  });
  // System pages (mvp-plan F1) — registry-driven, flagged `isSystem` so the
  // SDK groups them under "System pages" in the left panel and topbar.
  for (const key of SYSTEM_PAGE_TYPE_KEYS) {
    types.push({
      key,
      name: SYSTEM_PAGE_TYPE_NAMES[key] ?? key,
      helpText: "",
      icon: "",
      hasSlug: true,
      isSystem: true,
    });
  }
  return types;
}

/**
 * Per-collection `postCount` + template list — shared by GET_COLLECTIONS and
 * GET_WEBSITE_DATA. Reads from the tenant's `cms_collection` rows instead of
 * the removed CMS_COLLECTIONS config (F2.5).
 */
async function buildCollections(tx: TenantDb, organizationId: string) {
  const collections = await listCollections(tx, organizationId);
  const collectionPageTypes = collections.map((c) => c.pageType);
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
  return collections.map((c) => ({
    id: c.key,
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

          const activeTheme = await getActiveBuilderThemeAndTokens(tx, organizationId);
          const websiteSettings = {
            ...defaultWebsiteSettings,
            ...(activeTheme?.theme ? { theme: activeTheme.theme } : {}),
            ...(activeTheme?.componentTokens ? { componentTokens: activeTheme.componentTokens } : {}),
          };
          const collections = await buildCollections(tx, organizationId);
          const global = await getChaiGlobalData({
            lang: "en",
            draft: true,
            inBuilder: true,
          });

          return NextResponse.json({
            websiteSettings,
            websitePages: pages.map(toChaiPage),
            pageTypes: buildPageTypes(collections),
            libraries: [],
            collections,
            global,
            // UI locale for the editor chrome. Tenant-level default for now; a
            // per-organization `locale` column should flow through here later.
            uiLocale: "pl",
            role: session ? "admin" : "guest",
            settings: orgRow[0] ?? { name: "Akademia", currency: "PLN" },
          });
        }

        case "GET_WEBSITE_SETTINGS":
        case "GET_WEBSITE_DRAFT_SETTINGS": {
          const activeTheme = await getActiveBuilderThemeAndTokens(tx, organizationId);
          const websiteSettings = {
            ...defaultWebsiteSettings,
            ...(activeTheme?.theme ? { theme: activeTheme.theme } : {}),
            ...(activeTheme?.componentTokens ? { componentTokens: activeTheme.componentTokens } : {}),
          };
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
          const global = await getChaiGlobalData({
            lang: String(data?.lang ?? "en"),
            draft: true,
            inBuilder: true,
          });
          return NextResponse.json({
            draftPage,
            builderPageData: { global },
            languagePages: [],
          });
        }

        case "GET_BUILDER_PAGE_DATA": {
          const { pageType, pageProps } = data;
          let blogData = null;

          const collection = await getCollectionByPageType(tx, organizationId, pageType);
          if (collection && pageProps?.slug) {
            const slug = pageProps.slug.replace(/^\//, "");
            const [post] = await tx
              .select()
              .from(page)
              .where(
                and(
                  eq(page.organizationId, organizationId),
                  eq(page.slug, slug),
                  eq(page.pageType, collection.pageType),
                  ne(page.status, "archived"),
                ),
              )
              .limit(1);
            if (post) {
              const seo = (post.seo ?? {}) as Record<string, string>;
              const content = post.pageContent ?? {};
              blogData = {
                title: content.title ?? post.title,
                body: content.body ?? "",
                excerpt: content.excerpt ?? seo.description ?? "",
                image: content.image ?? seo.ogImage ?? "",
                tags: content.tags ?? [],
                categories: content.categories ?? [],
                url: `/${slug}`,
                datePublished: post.publishedAt?.toISOString() ?? new Date().toISOString(),
              };
            }
          }

          const global = await getChaiGlobalData({
            lang: String(data?.lang ?? "en"),
            draft: true,
            inBuilder: true,
          });
          return NextResponse.json({
            global,
            ...(blogData ? { blog: blogData } : {}),
          });
        }

        case "GET_PAGE_TYPES": {
          const collections = await buildCollections(tx, organizationId);
          return NextResponse.json(buildPageTypes(collections));
        }

        case "GET_COLLECTIONS": {
          return NextResponse.json({
            collections: await buildCollections(tx, organizationId),
          });
        }

        case "LIST_COLLECTION_ITEMS": {
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
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
            templateName: getTemplateNameOf(collection, r.templateId),
            status: r.status,
            createdAt: r.createdAt?.toISOString() ?? "",
          }));
          return NextResponse.json({ items });
        }

        case "GET_BLOG_POST_PREVIEW": {
          const post = data?.postId
            ? await getBlogPost(tx, organizationId, String(data.postId))
            : null;
          if (!post) {
            return NextResponse.json(
              { error: "Post not found" },
              { status: 404 },
            );
          }
          const content = post.pageContent ?? {};
          const seo = (post.seo ?? {}) as Record<string, string>;
          const preview = {
            id: post.id,
            title: content.title ?? post.title,
            body: content.body ?? "",
            excerpt: content.excerpt ?? seo.description ?? "",
            image: content.image ?? seo.ogImage ?? "",
            author: post.authorName ?? "",
            datePublished: post.publishedAt?.toISOString() ?? post.updatedAt.toISOString(),
            tags: content.tags ?? [],
            categories: content.categories ?? [],
            slug: post.slug,
          };
          return NextResponse.json({ preview });
        }

        case "GET_BLOG_POSTS_LIST": {
          const collection = await getCollectionByKey(tx, organizationId, "blog");
          if (!collection) {
            return NextResponse.json({ posts: [], total: 0 });
          }
          const conds = [
            eq(page.organizationId, organizationId),
            eq(page.pageType, collection.pageType),
            eq(page.status, "published"),
          ];
          const limit = Math.min(Number(data?.limit) || 6, 50);
          const offset = Number(data?.offset) || 0;
          const rows = await tx
            .select()
            .from(page)
            .where(and(...conds))
            .orderBy(desc(page.publishedAt))
            .limit(limit)
            .offset(offset);
          const [countRow] = await tx
            .select({ value: sql<number>`count(*)::int` })
            .from(page)
            .where(and(...conds));
          const posts = rows.map((r) => {
            const content = r.pageContent ?? {};
            return {
              id: r.id,
              title: content.title ?? r.title,
              slug: r.slug,
              excerpt: content.excerpt ?? "",
              image: content.image ?? null,
              author: null as string | null,
              datePublished: r.publishedAt?.toISOString() ?? null,
              tags: content.tags ?? [],
            };
          });
          return NextResponse.json({ posts, total: countRow?.value ?? 0 });
        }

        case "GET_ENROLLMENT_TYPES_LIST": {
          const rows = await listGroupTypes(tx, organizationId);
          const types = rows.map((gt) => ({ id: gt.id, name: gt.name }));
          return NextResponse.json({ types });
        }

        case "GET_ENROLLMENT_PREVIEW": {
          const groupId = data?.groupId;
          if (!groupId) {
            return NextResponse.json(
              { error: "Group type id is required" },
              { status: 400 },
            );
          }
          const gt = await getGroupType(tx, organizationId, String(groupId));
          if (!gt) {
            return NextResponse.json(
              { error: "Group type not found" },
              { status: 404 },
            );
          }
          const preview = await getEnrollmentPreviewForGroup(tx, organizationId, gt);
          return NextResponse.json({ preview });
        }

        case "GET_TEMPLATE_DATA": {
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          const template = getTemplateOf(collection, data?.templateId);
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
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          const template = getTemplateOf(collection, data?.templateId);
          if (!collection || !template) {
            return NextResponse.json(
              { error: "Collection or template not found" },
              { status: 404 },
            );
          }
          if (template.collectionId !== collection.key) {
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
              pageContent: { title, body: "", excerpt: "", image: "", tags: [], categories: [] },
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
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          const template = getTemplateOf(collection, data?.templateId);
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

        // ── Faza 2.5: Collection management ─────────────────────────────

        case "CREATE_COLLECTION": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const key = String(data?.key ?? "");
          const name = String(data?.name ?? "").trim();
          const pageType = String(data?.pageType ?? "").trim();
          const templatePageType = String(data?.templatePageType ?? "").trim();
          if (!COLLECTION_KEY_RE.test(key)) {
            return NextResponse.json(
              { error: "Collection key must match ^[a-z0-9_-]+$" },
              { status: 400 },
            );
          }
          if (!name || !pageType || !templatePageType) {
            return NextResponse.json(
              { error: "Collection name, pageType and templatePageType are required" },
              { status: 400 },
            );
          }
          const existing = await getCollectionByKey(tx, organizationId, key);
          if (existing) {
            return NextResponse.json(
              { error: "Collection with this key already exists" },
              { status: 409 },
            );
          }
          const pageTypeClash = await getCollectionByPageType(tx, organizationId, pageType);
          if (pageTypeClash) {
            return NextResponse.json(
              { error: "This pageType is already used by another collection" },
              { status: 409 },
            );
          }
          const position = await tx
            .select({ max: sql<number | null>`max(${cmsCollection.position})` })
            .from(cmsCollection)
            .where(eq(cmsCollection.organizationId, organizationId))
            .then((r) => (r[0]?.max ?? -1) + 1);
          const templates = Array.isArray(data?.templates)
            ? data.templates
            : [];

          // Auto-seed default templates for known collections (blog, courses)
          let finalTemplates = templates;
          if (templates.length === 0) {
            const defaultCollection = DEFAULT_CMS_COLLECTIONS.find((c) => c.key === key);
            if (defaultCollection) {
              finalTemplates = defaultCollection.templates;
            }
          }
          const inserted = await tx
            .insert(cmsCollection)
            .values({
              organizationId,
              key,
              name,
              pageType,
              templatePageType,
              templates: finalTemplates,
              position,
            })
            .returning();
          return NextResponse.json({ collection: inserted[0] });
        }

        case "UPDATE_COLLECTION": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          if (!collection) {
            return NextResponse.json(
              { error: "Collection not found" },
              { status: 404 },
            );
          }
          const set: Partial<typeof cmsCollection.$inferInsert> = { updatedAt: new Date() };
          if (data?.name !== undefined) {
            const name = String(data.name).trim();
            if (!name) {
              return NextResponse.json(
                { error: "Collection name cannot be empty" },
                { status: 400 },
              );
            }
            set.name = name;
          }
          if (data?.pageType !== undefined && data.pageType !== collection.pageType) {
            const pageType = String(data.pageType).trim();
            const clash = await getCollectionByPageType(tx, organizationId, pageType);
            if (clash && clash.id !== collection.id) {
              return NextResponse.json(
                { error: "This pageType is already used by another collection" },
                { status: 409 },
              );
            }
            set.pageType = pageType;
          }
          if (data?.templatePageType !== undefined && data.templatePageType !== collection.templatePageType) {
            set.templatePageType = String(data.templatePageType).trim();
          }
          if (data?.templates !== undefined) {
            if (!Array.isArray(data.templates) || data.templates.length > MAX_TEMPLATES_PER_COLLECTION) {
              return NextResponse.json(
                { error: `Templates must be an array of at most ${MAX_TEMPLATES_PER_COLLECTION}` },
                { status: 400 },
              );
            }
            set.templates = data.templates;
          }
          const updated = await tx
            .update(cmsCollection)
            .set(set)
            .where(eq(cmsCollection.id, collection.id))
            .returning();
          return NextResponse.json({ collection: updated[0] });
        }

        case "DELETE_COLLECTION": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          if (!collection) {
            return NextResponse.json(
              { error: "Collection not found" },
              { status: 404 },
            );
          }
          const [postCount] = await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(page)
            .where(
              and(
                eq(page.organizationId, organizationId),
                eq(page.pageType, collection.pageType),
                ne(page.status, "archived"),
              ),
            );
          if ((postCount?.count ?? 0) > 0) {
            return NextResponse.json(
              { error: "Cannot delete collection with existing posts" },
              { status: 409 },
            );
          }
          // Orphan template pages are archived so they stop resolving.
          await tx
            .update(page)
            .set({ status: "archived", updatedAt: new Date() })
            .where(
              and(
                eq(page.organizationId, organizationId),
                eq(page.pageType, collection.templatePageType),
              ),
            );
          await tx.delete(cmsCollection).where(eq(cmsCollection.id, collection.id));
          return NextResponse.json({ success: true });
        }

        case "CREATE_COLLECTION_TEMPLATE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          if (!collection) {
            return NextResponse.json(
              { error: "Collection not found" },
              { status: 404 },
            );
          }
          if (collection.templates.length >= MAX_TEMPLATES_PER_COLLECTION) {
            return NextResponse.json(
              { error: `A collection can have at most ${MAX_TEMPLATES_PER_COLLECTION} templates` },
              { status: 400 },
            );
          }
          const id = String(data?.template?.id ?? "").trim();
          const name = String(data?.template?.name ?? "").trim();
          if (!id || !name) {
            return NextResponse.json(
              { error: "Template id and name are required" },
              { status: 400 },
            );
          }
          if (collection.templates.some((t) => t.id === id)) {
            return NextResponse.json(
              { error: "Template with this id already exists" },
              { status: 409 },
            );
          }
          const templates = [
            ...collection.templates,
            {
              id,
              name,
              collectionId: collection.key,
              layout: String(data?.template?.layout ?? "single") as "single" | "sidebar",
            },
          ];
          const updated = await tx
            .update(cmsCollection)
            .set({ templates, updatedAt: new Date() })
            .where(eq(cmsCollection.id, collection.id))
            .returning();
          return NextResponse.json({ collection: updated[0] });
        }

        case "UPDATE_COLLECTION_TEMPLATE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          if (!collection) {
            return NextResponse.json(
              { error: "Collection not found" },
              { status: 404 },
            );
          }
          const templateId = String(data?.templateId ?? "");
          const existing = collection.templates.find((t) => t.id === templateId);
          if (!existing) {
            return NextResponse.json(
              { error: "Template not found" },
              { status: 404 },
            );
          }
          const templates = collection.templates.map((t) =>
            t.id === templateId
              ? {
                  ...t,
                  name: data?.name !== undefined ? String(data.name).trim() : t.name,
                  layout: data?.layout !== undefined ? (String(data.layout) as "single" | "sidebar") : t.layout,
                }
              : t,
          );
          const updated = await tx
            .update(cmsCollection)
            .set({ templates, updatedAt: new Date() })
            .where(eq(cmsCollection.id, collection.id))
            .returning();
          return NextResponse.json({ collection: updated[0] });
        }

        case "DELETE_COLLECTION_TEMPLATE": {
          if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          }
          const collection = await getCollectionByKey(tx, organizationId, data?.collectionId);
          if (!collection) {
            return NextResponse.json(
              { error: "Collection not found" },
              { status: 404 },
            );
          }
          if (collection.templates.length <= 1) {
            return NextResponse.json(
              { error: "A collection must keep at least one template" },
              { status: 400 },
            );
          }
          const templateId = String(data?.templateId ?? "");
          if (!collection.templates.some((t) => t.id === templateId)) {
            return NextResponse.json(
              { error: "Template not found" },
              { status: 404 },
            );
          }
          const templates = collection.templates.filter((t) => t.id !== templateId);
          const updated = await tx
            .update(cmsCollection)
            .set({ templates, updatedAt: new Date() })
            .where(eq(cmsCollection.id, collection.id))
            .returning();
          return NextResponse.json({ collection: updated[0] });
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
          // System pages keep their type — re-typing would unmount them from
          // the system group and could orphan the org's 404/enrollment pages.
          if (isSystemPageTypeKey(existing.pageType) && data.pageType && data.pageType !== existing.pageType) {
            return NextResponse.json(
              { error: "System pages cannot change their page type" },
              { status: 403 },
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
          const existing = await getPageById(tx, organizationId, data.id);
          if (!existing) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          // Non-deletable system pages (mvp-plan F1): archiving would silently
          // disable the org's 404 / enrollment surfaces. Registry-driven —
          // `deletable: true` in system-pages.ts re-enables a type.
          if (isSystemPageTypeKey(existing.pageType) && !isDeletableSystemPage(existing.pageType)) {
            return NextResponse.json(
              { error: "System pages cannot be deleted" },
              { status: 403 },
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
          // System pages are singleton per type — duplicating would mint a
          // second instance and break the "one per org" invariant.
          if (isSystemPageTypeKey(original.pageType)) {
            return NextResponse.json(
              { error: "System pages cannot be duplicated" },
              { status: 403 },
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
          const markExisting = await getPageById(tx, organizationId, data.id);
          if (!markExisting) {
            return NextResponse.json(
              { error: "Page not found" },
              { status: 404 },
            );
          }
          if (isSystemPageTypeKey(markExisting.pageType)) {
            return NextResponse.json(
              { error: "System pages cannot be marked as templates" },
              { status: 403 },
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
          const componentTokens = data?.settings?.componentTokens;
          if (componentTokens !== undefined && componentTokens !== null) {
            await upsertBuilderComponentTokens(tx, organizationId, componentTokens, userId);
          }
          return NextResponse.json({ success: true });
        }

        case "ASK_AI":
        case "GENERATE_HTML_FROM_PROMPT": {
          const handler = initChaiBuilderActionHandler({
            apiKey: organizationId,
            userId: userId ?? "",
          });
          const response = await handler({ action, data });

          if (response?._streamingResponse && response?._streamResult) {
            const result = response._streamResult;
            if (!result?.textStream) {
              return NextResponse.json({ error: "No streaming response available" }, { status: 500 });
            }
            const encoder = new TextEncoder();
            const readable = new ReadableStream({
              async start(controller) {
                try {
                  for await (const chunk of result.textStream) {
                    if (chunk) controller.enqueue(encoder.encode(chunk));
                  }
                  controller.close();
                } catch (err) {
                  controller.error(err);
                }
              },
            });
            return new Response(readable, {
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache",
              },
            });
          }
          return NextResponse.json(response);
        }

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
