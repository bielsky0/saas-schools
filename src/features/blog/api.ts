"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withLocale } from "@/lib/i18n/config";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";
import { invalid } from "@/lib/validation";
import { getBlogPost, createBlogPost, updateBlogPost, deleteBlogPost } from "./data";
import { createBlogPostSchema } from "./schema";

/**
 * Blog dashboard server actions (blog-templates-cms F5.1).
 *
 * Same conventions as the other dashboard features: `requireOrgPermission`
 * first (§4.2), audit row inside the same transaction as the write (Rule A).
 * Guarded by `cms.manage` — the same permission the ChaiBuilder CMS uses, so
 * whoever can edit pages can run the blog.
 */

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function strList(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string");
}

function parseSeo(formData: FormData) {
  const noIndex = formData.get("seo.noIndex") === "on";
  return {
    title: str(formData.get("seo.title")) || undefined,
    description: str(formData.get("seo.description")) || undefined,
    ogImage: str(formData.get("seo.ogImage")) || undefined,
    noIndex,
  };
}

export async function createBlogPostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");
  const t = await getTranslations("blog");

  const parsed = createBlogPostSchema(t).safeParse({
    title: str(formData.get("title")),
    slug: str(formData.get("slug")),
    body: str(formData.get("body")),
    excerpt: str(formData.get("excerpt")),
    image: str(formData.get("image")),
    tags: strList(formData, "tags"),
    categories: strList(formData, "categories"),
    seo: parseSeo(formData),
    status: str(formData.get("status")) === "published" ? "published" : "draft",
    templateId: str(formData.get("templateId")),
  });
  if (!parsed.success) return invalid(parsed.error, t("errors.generic"));

  const actor = await resolveActor(ctx.session);

  const row = await withTenant(ctx.org.id, async (tx) => {
    const created = await createBlogPost(tx, ctx.org.id, {
      title: parsed.data.title,
      slug: parsed.data.slug || undefined,
      body: parsed.data.body,
      excerpt: parsed.data.excerpt,
      image: parsed.data.image,
      tags: parsed.data.tags,
      categories: parsed.data.categories,
      seo: parsed.data.seo,
      status: parsed.data.status,
      templateId: parsed.data.templateId || null,
      authorId: actor.actorId ?? ctx.session.user.id,
    });

    await recordAudit(tx, {
      action: "blog_post.create",
      actor,
      organizationId: ctx.org.id,
      targetType: "blog_post",
      targetId: created.id,
      targetLabel: created.title,
      metadata: { status: created.status },
    });

    return created;
  });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");

  // next/navigation's `redirect` is resolved internally by Next, skipping the
  // proxy's locale prefix (F4.6) — so the target is prefixed here explicitly.
  redirect(withLocale(`/dashboard/blog/${row.id}`, await getLocale()));
}

export async function updateBlogPostAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("cms.manage");
  const t = await getTranslations("blog");
  const postId = str(formData.get("postId"));

  const parsed = createBlogPostSchema(t).safeParse({
    title: str(formData.get("title")),
    slug: str(formData.get("slug")),
    body: str(formData.get("body")),
    excerpt: str(formData.get("excerpt")),
    image: str(formData.get("image")),
    tags: strList(formData, "tags"),
    categories: strList(formData, "categories"),
    seo: parseSeo(formData),
    status: str(formData.get("status")) === "published" ? "published" : "draft",
    templateId: str(formData.get("templateId")),
  });
  if (!parsed.success) return invalid(parsed.error, t("errors.generic"));

  const actor = await resolveActor(ctx.session);

  const before = await withTenant(ctx.org.id, (tx) => getBlogPost(tx, ctx.org.id, postId));
  if (!before) return { error: t("errors.notFound") };

  const row = await withTenant(ctx.org.id, async (tx) => {
    const updated = await updateBlogPost(tx, ctx.org.id, postId, {
      title: parsed.data.title,
      slug: parsed.data.slug || undefined,
      body: parsed.data.body,
      excerpt: parsed.data.excerpt,
      image: parsed.data.image,
      tags: parsed.data.tags,
      categories: parsed.data.categories,
      seo: parsed.data.seo,
      status: parsed.data.status,
      templateId: parsed.data.templateId || null,
    });
    if (!updated) return null;

    await recordAudit(tx, {
      action: "blog_post.update",
      actor,
      organizationId: ctx.org.id,
      targetType: "blog_post",
      targetId: updated.id,
      targetLabel: updated.title,
      metadata: {
        status: updated.status,
        published: before.status !== "published" && updated.status === "published",
      },
    });

    return updated;
  });
  if (!row) return { error: t("errors.notFound") };

  revalidatePath("/dashboard/blog");
  revalidatePath(`/dashboard/blog/${row.id}`);
  revalidatePath("/blog");
  revalidatePath(`/blog/${row.slug}`);

  return { success: t("saved") };
}

export async function deleteBlogPostAction(formData: FormData): Promise<void> {
  const ctx = await requireOrgPermission("cms.manage");
  const postId = str(formData.get("postId"));
  if (!postId) return;

  const actor = await resolveActor(ctx.session);

  const before = await withTenant(ctx.org.id, (tx) => getBlogPost(tx, ctx.org.id, postId));
  if (!before) return;

  await withTenant(ctx.org.id, async (tx) => {
    await deleteBlogPost(tx, ctx.org.id, postId);
    await recordAudit(tx, {
      action: "blog_post.delete",
      actor,
      organizationId: ctx.org.id,
      targetType: "blog_post",
      targetId: postId,
      targetLabel: before.title,
    });
  });

  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
}
