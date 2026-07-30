import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listGroupTypes } from "@/features/groups/data";
import { withTenant } from "@/lib/db/tenant";

export async function GET() {
  const ctx = await requireOrgPermission("cms.manage");
  const types = await withTenant(ctx.org.id, (tx) => listGroupTypes(tx, ctx.org.id));
  const data = types.map((t) => ({ id: t.id, name: t.name }));
  return NextResponse.json(data);
}
