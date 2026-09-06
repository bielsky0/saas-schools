import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db/tenant";
import { ORG_SUBDOMAIN_HEADER } from "@/lib/tenant-host";
import { getOrgBySubdomain } from "@/features/organizations/data";
import { handleBuilderAction } from "@/features/cms/builder-actions";
import { createLogger } from "@/lib/logger";

/**
 * Tenant editor API (`{subdomain}/editor/api`) — one of two thin layers over
 * `src/features/cms/builder-actions.ts` (apex-dashboard-plan 4.3).
 *
 * Resolves the tenant from `ORG_SUBDOMAIN_HEADER`, takes the session for
 * `userId`/`role`, and runs the shared builder switch inside `withTenant`. No
 * audit callback: a tenant editing its own site is not a privileged act (unlike
 * the apex admin-editor route, which passes a Rule A auditor).
 *
 * Intentionally a PARALLEL PATH — the tenant route keeps its exact behaviour;
 * the apex route is additive.
 */
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
    const role = session ? "admin" : "guest";

    return withTenant(organizationId, (tx) =>
      handleBuilderAction({ tx, organizationId, userId, role, action, data }),
    );
  } catch (error) {
    createLogger("builder:editor-api").error("builder action failed", { err: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}