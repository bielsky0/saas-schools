import { NextResponse } from "next/server";

import { servedOrganization } from "@/features/organizations/served-org";
import { buildRobotsTxt } from "@/features/cms/sitemap";

/**
 * Per-tenant robots.txt — generated dynamically for the organization
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

  const robots = buildRobotsTxt(host);

  return new NextResponse(robots, {
    headers: { "Content-Type": "text/plain" },
  });
}
