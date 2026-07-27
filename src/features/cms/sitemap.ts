import { sql } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";

import { listPages, type PageRow } from "./data";

export type SitemapEntry = {
  slug: string;
  updatedAt: string;
};

export async function getPublishedPages(
  tx: TenantDb,
  orgId: string,
): Promise<SitemapEntry[]> {
  const pages = await listPages(tx, orgId, { status: "published" });
  return pages.map((p: PageRow) => ({
    slug: p.slug,
    updatedAt:
      typeof p.updatedAt === "string"
        ? p.updatedAt
        : new Date(p.updatedAt).toISOString(),
  }));
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
