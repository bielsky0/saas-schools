import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { groupType } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env/server";

type Body = {
  organizationId: string;
  groupTypeId: string;
  allowedPurchaseModes?: string[];
  allowedBillingTypes?: string[] | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;

  if (!body.organizationId || !body.groupTypeId) {
    return NextResponse.json(
      { ok: false, error: "missing required fields" },
      { status: 400 },
    );
  }

  await withTenant(body.organizationId, async (tx) => {
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.allowedPurchaseModes) update.allowedPurchaseModes = body.allowedPurchaseModes;
    if (body.allowedBillingTypes !== undefined) update.allowedBillingTypes = body.allowedBillingTypes ?? null;

    await tx
      .update(groupType)
      .set(update)
      .where(eq(groupType.id, body.groupTypeId));
  });

  return NextResponse.json({ ok: true });
}
