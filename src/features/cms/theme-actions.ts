"use server";

import { revalidatePath } from "next/cache";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation/state";

import { upsertTheme } from "./data";
import { createThemeSchema } from "./schema";

export async function upsertThemeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const parsed = createThemeSchema.safeParse({
    fontPrimary: formData.get("fontPrimary"),
    fontHeading: formData.get("fontHeading"),
    colorPrimary: formData.get("colorPrimary"),
    colorSecondary: formData.get("colorSecondary"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveActor(ctx.session);

  await withTenant(ctx.org.id, async (tx) => {
    const theme = await upsertTheme(tx, {
      organizationId: ctx.org.id,
      ...parsed.data,
      createdByUserId: ctx.session.user.id,
    });

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: "theme.update",
      targetType: "theme",
      targetId: theme.id,
      targetLabel: theme.fontPrimary,
    });
  });

  revalidatePath("/dashboard/cms/theme");
  return { success: "Theme updated" };
}
