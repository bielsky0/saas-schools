import { NextResponse } from "next/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listTrainers } from "@/features/trainers/data";
import { withTenant } from "@/lib/db/tenant";

export async function GET() {
  const ctx = await requireOrgPermission("cms.manage");
  const trainers = await withTenant(ctx.org.id, (tx) => listTrainers(tx, ctx.org.id));
  const data = trainers.map((t) => ({ id: t.userId, name: t.name ?? t.email, email: t.email }));
  return NextResponse.json(data);
}
