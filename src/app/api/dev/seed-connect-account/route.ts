import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { organization } from "@/lib/db/schema";
import { env } from "@/lib/env/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("dev:seed-connect-account");

/**
 * Dev-only: seed a Connect account id onto an org for E2E testing.
 * 404 in production.
 */
export async function POST(request: NextRequest) {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { orgSlug?: string; accountId?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  if (!body.orgSlug || !body.accountId) {
    return NextResponse.json({ error: "orgSlug and accountId required" }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(organization)
      .set({
        stripeConnectAccountId: body.accountId,
        stripeConnectStatus: "onboarding_incomplete",
        updatedAt: new Date(),
      })
      .where(eq(organization.slug, body.orgSlug))
      .returning({ id: organization.id, slug: organization.slug });

    if (!row) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ status: "ok", org: row.slug, accountId: body.accountId });
  } catch (err) {
    const cause = err instanceof Error && 'cause' in err ? String((err as any).cause) : 'none';
    log.error("seed-connect-account failed", { error: String(err), cause, orgSlug: body.orgSlug });
    return NextResponse.json({ error: String(err), cause }, { status: 500 });
  }
}
