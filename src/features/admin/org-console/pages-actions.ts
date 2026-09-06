"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/features/admin/audit";
import { requireSuperAdmin } from "@/features/admin/context";
import { page, pageVersion } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { publishPageSchema } from "./schema";

/**
 * Org-console pages actions (apex-dashboard-plan 4.2 pages).
 *
 * Publish a target org's CMS page. The page and its version snapshot are
 * tenant-scoped (`page.organizationId`), so the write runs through
 * `withTenant(orgId)`. A `page_version` row is captured at publish time so the
 * prior state is recoverable — publish/rollback timeline UI is Faza 6, but the
 * snapshot costs one row and there is no later publish path to add it to
 * (the tenant editor route would only add it in the autosave saga, Faza 6).
 *
 * `requireSuperAdmin()` first, audit Rule A in the same transaction.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

export async function publishPageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const parsed = publishPageSchema.safeParse({
    organizationId: str(formData.get("organizationId")),
    pageId: str(formData.get("pageId")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  const { organizationId, pageId } = parsed.data;

  try {
    await withTenant(organizationId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(page)
        .where(and(eq(page.id, pageId), eq(page.organizationId, organizationId)))
        .limit(1);
      if (!existing) {
        throw Object.assign(new Error("page not found"), { code: "NOT_FOUND" });
      }

      // Snapshot the state we are leaving, so the current published version is
      // always standing on a checkpoint (rollback in Faza 6).
      await tx.insert(pageVersion).values({
        id: crypto.randomUUID(),
        pageId,
        blocksJson: existing.blocks,
        seoJson: existing.seo,
        title: existing.title,
        statusSnapshot: existing.status,
        createdByUserId: ctx.actorId,
        comment: "Pre-publish snapshot (admin console)",
      });

      await tx
        .update(page)
        .set({
          status: "published",
          publishedAt: new Date(),
          publishedByUserId: ctx.actorId,
          updatedAt: new Date(),
        })
        .where(eq(page.id, pageId));

      await recordAudit(tx, {
        action: "page.publish",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "page",
        targetId: pageId,
        targetLabel: existing.slug,
        metadata: { pageVersionSnapshot: true },
      });
    });
  } catch (err) {
    if (err instanceof Error && (err as { code?: string }).code === "NOT_FOUND") {
      return { error: "Page not found." };
    }
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/admin/orgs/${organizationId}/console/pages`);
  return { success: "Page published." };
}