import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth";
import { withTenant } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { recordAudit } from "@/features/admin/audit";
import { getConsoleOrg } from "@/features/admin/org-console/data";
import type { BuilderAuditEntry } from "@/features/cms/builder-actions";
import { handleBuilderAction } from "@/features/cms/builder-actions";

/**
 * Apex admin-editor API (`/admin-editor/api/{orgId}`) — the second thin layer
 * over `src/features/cms/builder-actions.ts` (apex-dashboard-plan 4.3).
 *
 * The tenant id comes from the URL SEGMENT (never a client-controlled body
 * field), every call is guarded like `requireSuperAdmin`, and every mutation is
 * Rule A audit-logged with the acting super admin — the tenant editor (parallel
 * path) passes no auditor because editing one's own site is not a privileged
 * act, whereas a super admin editing someone else's site is (spec 6.3).
 *
 * The super-admin check is written inline (getServerSession + isSuperAdmin +
 * `impersonatedBy === null`) instead of calling `requireSuperAdmin`, because
 * that helper answers with `forbidden()`/`requireSession` — a redirect or an
 * HTML 403 page that a `fetch` from the editor would mis-parse. An API route
 * needs JSON status codes; the semantics (fail-closed on impersonation, same
 * flags) are identical to `src/features/admin/context.ts`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const { orgId } = await params;

    const session = await getServerSession();
    if (
      !session?.user ||
      session.impersonatedBy !== null ||
      !session.user.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const org = await getConsoleOrg(orgId);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { action, data } = body;

    const actor = {
      actorType: "SuperAdmin" as const,
      actorId: session.user.id,
      actorEmail: session.user.email,
    };

    // Rule A (spec 6.3): the audit row is written inside the SAME transaction
    // as the mutation, so a failed audit aborts the write — never a silent
    // unaudited change. `handleBuilderAction` awaits this callback as the last
    // step of each mutation branch.
    const audit = async (tx: Parameters<typeof recordAudit>[0], entry: BuilderAuditEntry) => {
      await recordAudit(tx, {
        ...entry,
        actor,
        organizationId: orgId,
      });
    };

    return withTenant(orgId, (tx) =>
      handleBuilderAction({
        tx,
        organizationId: orgId,
        userId: session.user.id,
        role: "admin",
        action,
        data,
        audit,
      }),
    );
  } catch (error) {
    createLogger("builder:admin-editor-api").error("builder action failed", { err: error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}