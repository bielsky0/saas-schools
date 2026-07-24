import { NextResponse, type NextRequest } from "next/server";

import { confirmCashPurchase } from "@/features/billing/purchases";
import { autoFillCredits } from "@/features/billing/auto-fill";
import { SYSTEM_ACTOR } from "@/features/admin/audit";
import { organization } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env/server";

/**
 * Test-only purchase trigger. Disabled in production.
 *
 * Allows the concurrency e2e spec to trigger two parallel purchases against
 * the same session. Not a real endpoint — exists only for the spec.
 */
type Body = {
  organizationId: string;
  clientId: string;
  productTemplateId: string;
  athleteId?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;

  try {
    const org = await withTenant(body.organizationId, async (tx) => {
      const [row] = await tx
        .select({ timezone: organization.timezone, currency: organization.currency })
        .from(organization)
        .where(
          and(eq(organization.id, body.organizationId), isNull(organization.deletedAt)),
        )
        .limit(1);
      return row ?? null;
    });
    if (!org) return NextResponse.json({ ok: false, error: "org not found" }, { status: 400 });

    const purchase = await withTenant(body.organizationId, (tx) =>
      confirmCashPurchase(tx, {
        organizationId: body.organizationId,
        clientId: body.clientId,
        productTemplateId: body.productTemplateId,
        athleteId: body.athleteId ?? null,
        timeZone: org.timezone,
        actor: SYSTEM_ACTOR,
      }),
    );

    const fillResult = await autoFillCredits({
      organizationId: body.organizationId,
      clientId: purchase.autoFill.clientId,
      clientEmail: purchase.autoFill.clientEmail,
      creditTypeId: purchase.autoFill.creditTypeId,
      currency: org.currency,
      athleteId: purchase.autoFill.athleteId,
    });

    return NextResponse.json({
      ok: true,
      purchaseId: purchase.purchaseId,
      creditsIssued: purchase.creditsIssued,
      settled: fillResult.settled,
      filled: fillResult.filled,
      skipped: fillResult.skipped.size,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
