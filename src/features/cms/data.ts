import { sql } from "drizzle-orm";
import { getPayload } from "payload";

import type { TenantDb } from "@/lib/db/tenant";
import config from "@/features/cms/payload-config";

import { getBlockGrants } from "./tenant-block-access";

export type PageRow = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  blocks: unknown;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
};

async function getPageDraft(
  organizationId: string,
  slug: string,
): Promise<PageRow | null> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: {
      slug: { equals: slug },
      organizationId: { equals: organizationId },
    },
    draft: true,
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = result.docs[0];
  if (!doc) return null;
  return {
    id: String(doc.id),
    title: (doc as any).title as string,
    slug: (doc as any).slug as string,
    status: (doc as any).status as "draft" | "published",
    blocks: (doc as any).blocks,
    organizationId: (doc as any).organizationId as string,
    createdAt: (doc as any).createdAt as string,
    updatedAt: (doc as any).updatedAt as string,
  };
}

export async function getPage(
  tx: TenantDb,
  organizationId: string,
  slug: string,
  options?: { draft?: boolean },
): Promise<PageRow | null> {
  if (options?.draft) {
    return getPageDraft(organizationId, slug);
  }
  // Public path: raw SQL on pages table (no draft — fast, no Payload overhead).
  const [row] = await tx.execute<PageRow>(
    sql`
      SELECT p.* FROM pages p
      WHERE p.organization_id = ${organizationId}
        AND p.slug = ${slug}
        AND p.deleted_at IS NULL
      LIMIT 1
    `,
  );
  return (row as PageRow) ?? null;
}

export async function listPages(
  tx: TenantDb,
  organizationId: string,
  opts?: { status?: "draft" | "published"; limit?: number; offset?: number },
): Promise<PageRow[]> {
  const conditions = [
    sql`p.organization_id = ${organizationId}`,
    sql`p.deleted_at IS NULL`,
  ];
  if (opts?.status) {
    conditions.push(sql`p.status = ${opts.status}`);
  }
  const rows = await tx.execute<PageRow>(
    sql`
      SELECT p.* FROM pages p
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY p.created_at DESC
      LIMIT ${opts?.limit ?? 50}
      OFFSET ${opts?.offset ?? 0}
    `,
  );
  return rows as unknown as PageRow[];
}

export async function createPage(
  tx: TenantDb,
  input: {
    organizationId: string;
    title: string;
    slug: string;
    status?: "draft" | "published";
    createdByUserId: string;
  },
): Promise<PageRow> {
  const [row] = await tx.execute<PageRow>(
    sql`
      INSERT INTO pages (title, slug, status, organization_id, created_by_user_id)
      VALUES (${input.title}, ${input.slug}, ${input.status ?? "draft"}, ${input.organizationId}, ${input.createdByUserId})
      RETURNING *
    `,
  );
  return row as PageRow;
}

export async function updatePage(
  tx: TenantDb,
  organizationId: string,
  slug: string,
  input: {
    title?: string;
    slug?: string;
    status?: "draft" | "published";
    updatedByUserId: string;
  },
): Promise<PageRow | null> {
  const sets: string[] = [];
  if (input.title !== undefined) sets.push(`title = ${JSON.stringify(input.title)}`);
  if (input.slug !== undefined) sets.push(`slug = ${JSON.stringify(input.slug)}`);
  if (input.status !== undefined) sets.push(`status = ${JSON.stringify(input.status)}`);
  if (input.updatedByUserId) sets.push(`updated_by_user_id = ${JSON.stringify(input.updatedByUserId)}`);
  if (sets.length === 0) return null;

  const [row] = await tx.execute<PageRow>(
    sql`
      UPDATE pages SET ${sql.raw(sets.join(", "))}
      WHERE organization_id = ${organizationId}
        AND slug = ${slug}
        AND deleted_at IS NULL
      RETURNING *
    `,
  );
  return (row as PageRow) ?? null;
}

export async function deletePage(
  tx: TenantDb,
  organizationId: string,
  slug: string,
): Promise<boolean> {
  const [row] = await tx.execute<{ id: string }>(
    sql`
      UPDATE pages SET deleted_at = now()
      WHERE organization_id = ${organizationId}
        AND slug = ${slug}
        AND deleted_at IS NULL
      RETURNING id
    `,
  );
  return !!row;
}

export type MediaRow = {
  id: string;
  altText: string | null;
  fileId: string;
  organizationId: string;
  createdAt: string;
};

export async function getMedia(
  tx: TenantDb,
  organizationId: string,
  id: string,
): Promise<MediaRow | null> {
  const [row] = await tx.execute<MediaRow>(
    sql`
      SELECT m.* FROM media m
      WHERE m.organization_id = ${organizationId}
        AND m.id = ${id}
        AND m.deleted_at IS NULL
      LIMIT 1
    `,
  );
  return (row as MediaRow) ?? null;
}

export async function listMedia(
  tx: TenantDb,
  organizationId: string,
): Promise<MediaRow[]> {
  const rows = await tx.execute<MediaRow>(
    sql`
      SELECT m.* FROM media m
      WHERE m.organization_id = ${organizationId}
        AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
    `,
  );
  return rows as unknown as MediaRow[];
}

export type ThemeRow = {
  id: string;
  fontPrimary: string;
  fontHeading: string;
  colorPrimary: string;
  colorSecondary: string;
  borderRadius: string;
  organizationId: string;
};

export async function getTheme(
  tx: TenantDb,
  organizationId: string,
): Promise<ThemeRow | null> {
  const [row] = await tx.execute<ThemeRow>(
    sql`
      SELECT
        t.id,
        t.font_primary AS "fontPrimary",
        t.font_heading AS "fontHeading",
        t.color_primary AS "colorPrimary",
        t.color_secondary AS "colorSecondary",
        t.border_radius AS "borderRadius",
        t.organization_id AS "organizationId"
      FROM theme t
      WHERE t.organization_id = ${organizationId}
      LIMIT 1
    `,
  );
  return (row as ThemeRow) ?? null;
}


