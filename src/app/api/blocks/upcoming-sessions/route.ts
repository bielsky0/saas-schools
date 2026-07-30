import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { getUpcomingSessionsForBlock } from "@/lib/block-data";
import { withTenant } from "@/lib/db/tenant";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const groupTypeId = searchParams.get("groupTypeId") ?? undefined;
  const limit = searchParams.get("limit")
    ? Number.parseInt(searchParams.get("limit")!, 10)
    : undefined;

  const ctx = await requireOrgPermission("cms.manage");
  const data = await withTenant(ctx.org.id, (tx) =>
    getUpcomingSessionsForBlock(tx, ctx.org.id, { groupTypeId, limit }),
  );

  return NextResponse.json(data);
}
