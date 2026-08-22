import "server-only";

import {
  registerChaiCollection,
  registerChaiGlobalDataProvider,
  registerChaiPageType,
} from "@chaibuilder/sdk/runtime";

import { servedOrganization } from "@/features/organizations/served-org";
import {
  getBlogPostBySlug,
  getBlogPostPreviewForPost,
  getBlogPosts,
  getBlogPostsCount,
} from "@/lib/block-data";
import { withTenant } from "@/lib/db/tenant";

/**
 * Builder data providers (data-binding, F5.5+) — the four SDK registries that
 * turn `{{global.*}}`, `{{blog.*}}` and the `blog` Repeater collection into
 * tenant-scoped data.
 *
 * ─── Tenant resolution ───────────────────────────────────────────────────
 *
 * None of the SDK provider signatures receive an org id — they get
 * `{ lang, draft, inBuilder, pageProps }` only. So every provider resolves the
 * org itself via `servedOrganization()`, which reads `x-org-subdomain` from the
 * header the proxy publishes with a delete-before-set (D56). A client cannot
 * spoof it, so this is the same trust boundary every server component already
 * relies on. The registration is a module-level singleton (one per process);
 * the provider FUNCTIONS are called per request, on the server, and resolve the
 * tenant from the current request's headers.
 */

type OrgBasics = {
  name: string;
  logo: string | null;
  currency: string;
  timezone: string;
  subdomain: string;
};

/** Org basics surfaced as `{{global.*}}` for editors. */
export function getOrgGlobalData(org: {
  name: string;
  logo: string | null;
  currency: string;
  timezone: string;
  subdomain: string;
}): OrgBasics {
  return {
    name: org.name,
    logo: org.logo,
    currency: org.currency,
    timezone: org.timezone,
    subdomain: org.subdomain,
  };
}

/** `{{global.siteName}}`, `{{global.logo}}`, … — org basics under global.* */
export async function loadGlobalData(): Promise<Record<string, unknown>> {
  const org = await servedOrganization();
  if (!org) return {};
  return getOrgGlobalData(org);
}

/** `{{blog.*}}` — the post the current blog page renders, by `pageProps.slug`. */
async function loadBlogPostData(args: {
  lang: string;
  draft: boolean;
  inBuilder: boolean;
  pageProps: { slug?: string };
}): Promise<Record<string, unknown>> {
  const org = await servedOrganization();
  if (!org) return {};
  const slug = args.pageProps?.slug?.replace(/^\//, "");
  if (!slug) return {};
  const post = await withTenant(org.id, (tx) => getBlogPostBySlug(tx, org.id, slug));
  if (!post) return {};
  const preview = await withTenant(org.id, (tx) => getBlogPostPreviewForPost(tx, post));
  return { blog: preview };
}

/** `blog` Repeater collection — published posts, newest first. */
async function fetchBlogCollection(): Promise<{ items: Record<string, unknown>[]; totalItems: number }> {
  const org = await servedOrganization();
  if (!org) return { items: [], totalItems: 0 };
  const posts = await withTenant(org.id, (tx) => getBlogPosts(tx, org.id, 50, 0));
  const total = await withTenant(org.id, (tx) => getBlogPostsCount(tx, org.id));
  const items = posts.map((p) => {
    const content = p.pageContent ?? {};
    const seo = (p.seo ?? {}) as { description?: string; ogImage?: string };
    return {
      id: p.id,
      slug: p.slug,
      title: content.title ?? p.title,
      body: content.body ?? "",
      excerpt: content.excerpt ?? seo.description ?? "",
      image: content.image ?? seo.ogImage ?? "",
      tags: content.tags ?? [],
      categories: content.categories ?? [],
    };
  });
  return { items, totalItems: total };
}

let registered = false;

/** Register all builder providers once per process. Call at module scope. */
export function registerBuilderProviders(): void {
  if (registered) return;
  registered = true;

  registerChaiGlobalDataProvider(loadGlobalData);

  registerChaiPageType("blog", {
    name: "Blog Post",
    helpText: "A blog post page.",
    dynamicSegments: "/[a-z0-9-]+",
    dynamicSlug: "[slug]",
    dataProvider: loadBlogPostData,
    getDynamicPages: async () => {
      const org = await servedOrganization();
      if (!org) return [];
      const posts = await withTenant(org.id, (tx) => getBlogPosts(tx, org.id, 50, 0));
      return posts.map((p) => ({ id: p.id, name: p.title, slug: `/${p.slug}`, lang: "en" }));
    },
  });

  registerChaiCollection("blog", {
    name: "Blog Posts",
    fetch: fetchBlogCollection,
  });
}