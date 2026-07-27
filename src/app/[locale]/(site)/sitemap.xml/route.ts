import { NextResponse } from "next/server";

import { servedOrganization } from "@/features/organizations/served-org";
import { getPublishedPages, buildSitemapXml } from "@/features/cms/sitemap";
import { withTenant } from "@/lib/db/tenant";

/**
 * Per-tenant sitemap.xml — lists published CMS pages for the organization
 * resolved from the Host header.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const org = await servedOrganization();
  if (!org) {
    return new NextResponse("Not found", { status: 404 });
  }

  const host = org.subdomain
    ? `${org.subdomain}.${process.env.ROOT_DOMAIN ?? "langlion.pl"}`
    : process.env.ROOT_DOMAIN ?? "langlion.pl";

  const entries = await withTenant(org.id, (tx) => getPublishedPages(tx, org.id));

  const xml = buildSitemapXml(entries, host);

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
