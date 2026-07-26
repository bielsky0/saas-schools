"use server";

import { revalidatePath } from "next/cache";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import {
  createConsentDocument,
  deactivateConsentDocument,
  getConsentDocument,
  updateConsentDocument as updateConsentDocumentData,
} from "./data";
import { createConsentDocumentSchema, updateConsentDocumentSchema } from "./schema";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

export async function createConsentDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("consent_documents.manage");

  const parsed = createConsentDocumentSchema.safeParse({
    name: str(formData.get("name")),
    file_id: str(formData.get("file_id")) || undefined,
    body: str(formData.get("body")) || undefined,
    isRequiredAtSignup:
      str(formData.get("isRequiredAtSignup")) === "on"
        ? true
        : str(formData.get("isRequiredAtSignup")) === "false"
          ? false
          : undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveActor(ctx.session);
  const doc = await withTenant(ctx.org.id, async (tx) => {
    const row = await createConsentDocument(tx, {
      organizationId: ctx.org.id,
      name: parsed.data.name,
      file_id: parsed.data.file_id,
      body: parsed.data.body,
      isRequiredAtSignup: parsed.data.isRequiredAtSignup,
    });
    await recordAudit(tx, {
      action: "consent_document.create",
      actor,
      organizationId: ctx.org.id,
      targetType: "consent_document",
      targetId: row.id,
      targetLabel: row.name,
      metadata: { version: row.version },
    });
    return row;
  });

  revalidatePath("/dashboard/consents");
  return { success: "Consent document created" };
}

export async function updateConsentDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("consent_documents.manage");

  const parsed = updateConsentDocumentSchema.safeParse({
    id: str(formData.get("id")),
    name: str(formData.get("name")) || undefined,
    file_id: str(formData.get("file_id")) || null,
    body: str(formData.get("body")) || null,
    isRequiredAtSignup:
      str(formData.get("isRequiredAtSignup")) === "on"
        ? true
        : str(formData.get("isRequiredAtSignup")) === ""
          ? undefined
          : false,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveActor(ctx.session);
  const doc = await withTenant(ctx.org.id, async (tx) => {
    const old = await getConsentDocument(tx, ctx.org.id, parsed.data.id);
    if (!old) throw new Error("Consent document not found");

    return updateConsentDocumentData(tx, {
      organizationId: ctx.org.id,
      id: parsed.data.id,
      name: parsed.data.name,
      file_id: parsed.data.file_id,
      body: parsed.data.body,
      isRequiredAtSignup: parsed.data.isRequiredAtSignup,
    });
  });

  await withTenant(ctx.org.id, async (tx) => {
    await recordAudit(tx, {
      action: "consent_document.update",
      actor,
      organizationId: ctx.org.id,
      targetType: "consent_document",
      targetId: doc.id,
      targetLabel: doc.name,
      metadata: { version: doc.version },
    });
  });

  revalidatePath("/dashboard/consents");
  return { success: "Consent document updated" };
}

export async function deactivateConsentDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("consent_documents.manage");

  const id = str(formData.get("id"));
  if (!id) return { error: "ID is required" };

  await withTenant(ctx.org.id, async (tx) => {
    const doc = await getConsentDocument(tx, ctx.org.id, id);
    if (!doc) throw new Error("Consent document not found");

    await deactivateConsentDocument(tx, ctx.org.id, id);

    const actor = await resolveActor(ctx.session);
    await recordAudit(tx, {
      action: "consent_document.deactivate",
      actor,
      organizationId: ctx.org.id,
      targetType: "consent_document",
      targetId: doc.id,
      targetLabel: doc.name,
    });
  });

  revalidatePath("/dashboard/consents");
  return { success: "Consent document deactivated" };
}
