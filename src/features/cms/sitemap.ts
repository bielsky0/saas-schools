import { sql } from "drizzle-orm";
import { and, eq, ne } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";

import { listPages, type PageRow } from "./data";
import { cmsCollection } from "@/lib/db/schema/cms-collections";
import { page } from "@/lib/db/schema/pages";

export type SitemapEntry = {
  slug: string;
  updatedAt: string;
};

export async function getPublishedPages(
  tx: TenantDb,
  orgId: string,
): Promise<SitemapEntry[]> {
  // 1. Regular CMS pages
  const pages = await listPages(tx, orgId, { status: "published" });
  const entries: SitemapEntry[] = pages.map((p: PageRow) => ({
    slug: p.slug,
    updatedAt:
      typeof p.updatedAt === "string"
        ? p.updatedAt
        : new Date(p.updatedAt).toISOString(),
  }));

  // 2. Dynamic collections (blog, courses, etc.)
  const collections = await tx
    .select({ pageType: cmsCollection.pageType })
    .from(cmsCollection)
    .where(eq(cmsCollection.organizationId, orgId));

  for (const coll of collections) {
    const posts = await tx
      .select({ slug: page.slug, updatedAt: page.updatedAt })
      .from(page)
      .where(
        and(
          eq(page.organizationId, orgId),
          eq(page.pageType, coll.pageType),
          eq(page.status, "published"),
          ne(page.slug, ""), // skip home page
        ),
      );

    for (const post of posts) {
      entries.push({
        slug: post.slug,
        updatedAt:
          typeof post.updatedAt === "string"
            ? post.updatedAt
            : new Date(post.updatedAt).toISOString(),
      });
    }
  }

  return entries;
}

export function buildSitemapXml(entries: SitemapEntry[], host: string): string {
  const urls = entries.map(
    (e) =>
      `  <url>
    <loc>https://${host}${e.slug ? `/${encodeURIComponent(e.slug)}` : ""}</loc>
    <lastmod>${e.updatedAt}</lastmod>
    <priority>${e.slug === "" ? "1.0" : "0.8"}</priority>
  </url>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

export function buildRobotsTxt(host: string): string {
  return `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /admin
Disallow: /api

Sitemap: https://${host}/sitemap.xml
`;
}
