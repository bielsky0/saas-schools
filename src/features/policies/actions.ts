"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { groupType, policyDocument } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import {
  createPolicyDocument,
  deactivatePolicyDocument,
  getPolicyDocument,
  listPolicyAcceptances,
} from "./data";
import { createPolicyDocumentSchema } from "./schema";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function createPolicyDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("groups");

  const parsed = createPolicyDocumentSchema.safeParse({
    name: str(formData.get("name")),
    file_id: str(formData.get("file_id")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("errors.generic") };
  }

  await withTenant(ctx.org.id, (tx) =>
    createPolicyDocument(tx, {
      organizationId: ctx.org.id,
      name: parsed.data.name,
      file_id: parsed.data.file_id,
    }),
  );

  revalidatePath("/dashboard/policies");
  return { success: "Regulamin utworzony." };
}

export async function uploadNewPolicyVersionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("groups");

  const policyDocId = str(formData.get("policyDocumentId"));
  const newFileId = str(formData.get("file_id"));
  const name = str(formData.get("name"));

  if (!policyDocId || !newFileId) {
    return { error: t("errors.generic") };
  }

  await withTenant(ctx.org.id, async (tx) => {
    const old = await getPolicyDocument(tx, ctx.org.id, policyDocId);
    if (!old) throw new Error("Policy document not found");

    const newVersion = old.version + 1;

    const [inserted] = await tx
      .insert(policyDocument)
      .values({
        organizationId: ctx.org.id,
        name: name || old.name,
        file_id: newFileId,
        version: newVersion,
        isActive: true,
      })
      .returning();
    if (!inserted) throw new Error("insertPolicyVersion: insert returned no row");

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
  return { success: "Nowa wersja regulaminu opublikowana." };
}

export async function assignPolicyToGroupTypeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("groups");

  const groupTypeId = str(formData.get("groupTypeId"));
  const policyDocId = str(formData.get("policyDocumentId"));

  if (!groupTypeId) {
    return { error: t("errors.generic") };
  }

  await withTenant(ctx.org.id, (tx) =>
    tx
      .update(groupType)
      .set({
        policyDocumentId: policyDocId || null,
        updatedAt: new Date(),
      })
      .where(and(eq(groupType.id, groupTypeId), eq(groupType.organizationId, ctx.org.id))),
  );

  revalidatePath("/dashboard/group-types");
  return { success: "Regulamin przypisany do oferty." };
}

export async function getClientAcceptanceHistoryAction(clientId: string) {
  const ctx = await requireOrgPermission("audit.read");

  const rows = await withTenant(ctx.org.id, (tx) =>
    listPolicyAcceptances(tx, ctx.org.id, { clientId }),
  );

  return rows;
}
