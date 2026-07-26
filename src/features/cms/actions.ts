"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation/state";

import { createPageSchema, updatePageSchema } from "./schema";

export type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  blocks: unknown;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export async function createPageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const parsed = createPageSchema().safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    status: formData.get("status") ?? "draft",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveActor(ctx.session);

  const page = await withTenant(ctx.org.id, async (tx) => {
    const [slugExists] = await tx.execute<{ id: string }>(
      sql`SELECT id FROM pages WHERE organization_id = ${ctx.org.id} AND slug = ${parsed.data.slug} AND deleted_at IS NULL LIMIT 1`,
    );
    if (slugExists) {
      return null;
    }

    const [row] = await tx.execute<PageRow>(
      sql`INSERT INTO pages (title, slug, status, organization_id, created_by_user_id)
          VALUES (${parsed.data.title}, ${parsed.data.slug}, ${parsed.data.status}, ${ctx.org.id}, ${ctx.session.user.id})
          RETURNING *`,
    );
    const page = row as PageRow;

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: "page.create",
      targetType: "page",
      targetId: page.id,
      targetLabel: parsed.data.title,
    });

    return page;
  });

  if (!page) {
    return { error: "A page with this slug already exists" };
  }

  revalidatePath("/dashboard/cms");
  return { success: "Page created" };
}

export async function updatePageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const pageId = formData.get("pageId");
  if (typeof pageId !== "string" || !pageId) {
    return { error: "Page ID is required" };
  }

  const parsed = updatePageSchema().safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const page = await withTenant(ctx.org.id, async (tx) => {
    const sets: string[] = [];
    if (parsed.data.title !== undefined) sets.push(`title = ${JSON.stringify(parsed.data.title)}`);
    if (parsed.data.slug !== undefined) sets.push(`slug = ${JSON.stringify(parsed.data.slug)}`);
    if (parsed.data.status !== undefined) sets.push(`status = ${JSON.stringify(parsed.data.status)}`);
    sets.push(`updated_by_user_id = ${JSON.stringify(ctx.session.user.id)}`);

    if (sets.length === 1) return null;

    const [row] = await tx.execute<PageRow>(
      sql`UPDATE pages SET ${sql.raw(sets.join(", "))}
          WHERE id = ${pageId}
            AND organization_id = ${ctx.org.id}
            AND deleted_at IS NULL
          RETURNING *`,
    );
    return (row as PageRow) ?? null;
  });

  if (!page) {
    return { error: "Page not found" };
  }

  revalidatePath("/dashboard/cms");
  return { success: "Page updated" };
}

export async function publishPageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const pageId = formData.get("pageId");
  if (typeof pageId !== "string" || !pageId) {
    return { error: "Page ID is required" };
  }

  const actor = await resolveActor(ctx.session);

  const page = await withTenant(ctx.org.id, async (tx) => {
    const [row] = await tx.execute<PageRow>(
      sql`UPDATE pages
          SET status = 'published', updated_by_user_id = ${ctx.session.user.id}
          WHERE id = ${pageId}
            AND organization_id = ${ctx.org.id}
            AND deleted_at IS NULL
          RETURNING *`,
    );
    const page = (row as PageRow) ?? null;
    if (!page) return null;

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: "page.publish",
      targetType: "page",
      targetId: page.id,
      targetLabel: page.title,
    });

    return page;
  });

  if (!page) {
    return { error: "Page not found" };
  }

  revalidatePath("/dashboard/cms");
  revalidatePath(`/${page.slug}`);
  return { success: "Page published" };
}

export async function unpublishPageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const pageId = formData.get("pageId");
  if (typeof pageId !== "string" || !pageId) {
    return { error: "Page ID is required" };
  }

  const actor = await resolveActor(ctx.session);

  const page = await withTenant(ctx.org.id, async (tx) => {
    const [row] = await tx.execute<PageRow>(
      sql`UPDATE pages
          SET status = 'draft', updated_by_user_id = ${ctx.session.user.id}
          WHERE id = ${pageId}
            AND organization_id = ${ctx.org.id}
            AND deleted_at IS NULL
          RETURNING *`,
    );
    const page = (row as PageRow) ?? null;
    if (!page) return null;

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: "page.unpublish",
      targetType: "page",
      targetId: page.id,
      targetLabel: page.title,
    });

    return page;
  });

  if (!page) {
    return { error: "Page not found" };
  }

  revalidatePath("/dashboard/cms");
  revalidatePath(`/${page.slug}`);
  return { success: "Page unpublished" };
}

export async function deletePageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");

  const pageId = formData.get("pageId");
  if (typeof pageId !== "string" || !pageId) {
    return { error: "Page ID is required" };
  }

  const actor = await resolveActor(ctx.session);

  const page = await withTenant(ctx.org.id, async (tx) => {
    const [row] = await tx.execute<{ id: string; title: string; slug: string }>(
      sql`UPDATE pages
          SET deleted_at = now()
          WHERE id = ${pageId}
            AND organization_id = ${ctx.org.id}
            AND deleted_at IS NULL
          RETURNING id, title, slug`,
    );
    const page = row ?? null;
    if (!page) return null;

    await recordAudit(tx, {
      actor,
      organizationId: ctx.org.id,
      action: "page.delete",
      targetType: "page",
      targetId: page.id,
      targetLabel: page.title,
    });

    return page;
  });

  if (!page) {
    return { error: "Page not found" };
  }

  revalidatePath("/dashboard/cms");
  return { success: "Page deleted" };
}
