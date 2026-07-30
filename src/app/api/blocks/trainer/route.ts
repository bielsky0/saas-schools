import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { getTrainerForBlock } from "@/lib/block-data";
import { withTenant } from "@/lib/db/tenant";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const ctx = await requireOrgPermission("cms.manage");
  const data = await withTenant(ctx.org.id, (tx) =>
    getTrainerForBlock(tx, ctx.org.id, id),
  );
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
