import { and, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { clientPriceOverride } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env/server";
import { sqlStateOf } from "../sql-error";

/**
 * Test-only client price override fixture + prober (Faza 21, EPIK 33).
 * Disabled in production.
 *
 * Follows the credits dev route pattern: every write goes through
 * `withTenant` so the test is evidence the RLS path works.
 */

type Body = {
  action: "grant" | "deactivate";
  organizationId?: string;
  clientId?: string;
  groupTypeId?: string | null;
  overrideType?: "percent_discount" | "fixed_price";
  value?: number;
  validFrom?: string;
  validUntil?: string | null;
  reason?: string;
  grantedByUserId?: string;
  // deactivate
  overrideId?: string;
  // state
  clientIdForState?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;

  try {
    const organizationId = body.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }

    if (body.action === "grant") {
      const result = await withTenant(organizationId, (tx) =>
        tx
          .insert(clientPriceOverride)
          .values({
            organizationId,
            clientId: body.clientId!,
            groupTypeId: body.groupTypeId ?? null,
            overrideType: body.overrideType ?? "percent_discount",
            value: body.value ?? 0,
            validFrom: body.validFrom ?? new Date().toISOString().slice(0, 10),
            validUntil: body.validUntil ?? null,
            reason: body.reason ?? "E2E test grant",
            grantedByUserId: body.grantedByUserId ?? "00000000-0000-0000-0000-000000000000",
            isActive: true,
          })
          .returning({ id: clientPriceOverride.id }),
      );
      return NextResponse.json({ ok: true, overrideId: result[0]!.id });
    }

    if (body.action === "deactivate") {
      await withTenant(organizationId, (tx) =>
        tx
          .update(clientPriceOverride)
          .set({ isActive: false, updatedAt: new Date() })
          .where(
            and(
              eq(clientPriceOverride.id, body.overrideId!),
              eq(clientPriceOverride.organizationId, organizationId),
            ),
          ),
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, sqlState: sqlStateOf(err), message: String(err) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  const clientId = searchParams.get("clientId");

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
  }

  try {
    const rows = await withTenant(organizationId, (tx) =>
      tx
        .select()
        .from(clientPriceOverride)
        .where(
          clientId
            ? and(
                eq(clientPriceOverride.organizationId, organizationId),
                eq(clientPriceOverride.clientId, clientId),
              )
            : eq(clientPriceOverride.organizationId, organizationId),
        )
        .orderBy(desc(clientPriceOverride.createdAt)),
    );

    return NextResponse.json({ ok: true, overrides: rows });
  } catch (err) {
    return NextResponse.json(
      { ok: false, sqlState: sqlStateOf(err), message: String(err) },
      { status: 500 },
    );
  }
}
