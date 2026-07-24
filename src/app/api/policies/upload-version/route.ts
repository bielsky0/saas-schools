import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { requireOrgPermission } from "@/features/organizations/context";
import { getPolicyDocument, deactivatePolicyDocument } from "@/features/policies/data";
import { and, eq } from "drizzle-orm";
import { groupType, policyDocument } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

export async function POST(request: Request) {
  const ctx = await requireOrgPermission("group_types.manage");
  const formData = await request.formData();

  const policyDocId = formData.get("policyDocumentId") as string | null;
  const newFileId = formData.get("file_id") as string | null;

  if (!policyDocId || !newFileId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await withTenant(ctx.org.id, async (tx) => {
    const old = await getPolicyDocument(tx, ctx.org.id, policyDocId);
    if (!old) throw new Error("Policy document not found");

    const newVersion = old.version + 1;

    const [inserted] = await tx
      .insert(policyDocument)
      .values({
        organizationId: ctx.org.id,
        name: old.name,
        file_id: newFileId,
        version: newVersion,
        isActive: true,
      })
      .returning();
    if (!inserted) throw new Error("insert returned no row");

    await tx
      .update(groupType)
      .set({ policyDocumentId: inserted.id })
      .where(
        and(eq(groupType.policyDocumentId, policyDocId), eq(groupType.organizationId, ctx.org.id)),
      );

    await deactivatePolicyDocument(tx, ctx.org.id, policyDocId);
  });

  revalidatePath("/dashboard/policies");
  revalidatePath("/dashboard/group-types");
  return NextResponse.json({ success: true });
}
