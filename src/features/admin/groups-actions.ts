"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { withSystemBypass } from "@/lib/db/system";
import { adminClientGroup, adminClientGroupMember } from "@/lib/db/schema";
import { resolveUniqueSlug } from "@/features/organizations/slug";
import type { FormState } from "@/lib/validation";
import { recordAudit } from "./audit";
import { requireSuperAdmin } from "./context";

/**
 * Client group server actions (apex-dashboard-plan Faza 2.3).
 *
 * Every action follows the same invariant as plans-data.ts:
 *   1. `requireSuperAdmin()` as the FIRST line
 *   2. Write in `withSystemBypass` (GLOBAL tables, no tenant GUC)
 *   3. `recordAudit(tx, ...)` inside the SAME transaction (Rule A)
 *   4. `revalidatePath` after commit
 *
 * NOTE on slug uniqueness: `admin_client_group` is fail-closed under RLS — a
 * plain `db` read sees NO rows even when a slug IS taken (migration 0085 leaves
 * no permissive SELECT). Every existence probe therefore runs inside
 * `withSystemBypass`, including the one `resolveUniqueSlug` calls.
 */

const GENERIC_ERROR = "Something went wrong. Please try again.";

function str(value: FormDataEntryValue | null): string {
  return (typeof value === "string" ? value : "").trim();
}

// ── Client group CRUD ────────────────────────────────────────────────────

export async function createClientGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const name = str(formData.get("name"));
  if (!name) return { error: "Name is required." };
  const description = str(formData.get("description")) || null;

  try {
    const slug = await resolveUniqueSlug(name, async (candidate) => {
      const rows = await withSystemBypass("super admin: group slug taken check", (tx) =>
        tx
          .select({ id: adminClientGroup.id })
          .from(adminClientGroup)
          .where(eq(adminClientGroup.slug, candidate))
          .limit(1),
      );
      return rows.length > 0;
    });

    await withSystemBypass("super admin: create client group", async (tx) => {
      const [row] = await tx
        .insert(adminClientGroup)
        .values({ id: crypto.randomUUID(), name, slug, description })
        .returning({ id: adminClientGroup.id, slug: adminClientGroup.slug });

      if (!row) throw new Error("no row returned");

      await recordAudit(tx, {
        action: "client_group.create",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "client_group",
        targetId: row.id,
        targetLabel: row.slug,
        metadata: { name, slug: row.slug, description },
      });
    });

    revalidatePath("/admin/groups");
    return { success: `Group "${name}" created.` };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function updateClientGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const id = str(formData.get("groupId"));
  if (!id) return { error: "Group id is required." };

  const name = str(formData.get("name"));
  const description = str(formData.get("description"));

  try {
    let slug = "";
    await withSystemBypass("super admin: update client group", async (tx) => {
      const [existing] = await tx
        .select({
          id: adminClientGroup.id,
          slug: adminClientGroup.slug,
          name: adminClientGroup.name,
        })
        .from(adminClientGroup)
        .where(eq(adminClientGroup.id, id))
        .limit(1);
      if (!existing) throw new Error("group not found");
      slug = existing.slug;

      const nextName = name || existing.name;
      const nextDescription = description || null;

      await tx
        .update(adminClientGroup)
        .set({ name: nextName, description: nextDescription, updatedAt: new Date() })
        .where(eq(adminClientGroup.id, id));

      await recordAudit(tx, {
        action: "client_group.update",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "client_group",
        targetId: id,
        targetLabel: slug,
        metadata: { name: nextName, description: nextDescription },
      });
    });

    revalidatePath("/admin/groups");
    revalidatePath(`/admin/groups/${id}`);
    return { success: "Group updated." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function deleteClientGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const id = str(formData.get("groupId"));
  if (!id) return { error: "Group id is required." };

  try {
    let name = "";
    await withSystemBypass("super admin: delete client group", async (tx) => {
      const [existing] = await tx
        .select({
          id: adminClientGroup.id,
          slug: adminClientGroup.slug,
          name: adminClientGroup.name,
        })
        .from(adminClientGroup)
        .where(eq(adminClientGroup.id, id))
        .limit(1);
      if (!existing) throw new Error("group not found");
      name = existing.name;

      await tx.delete(adminClientGroupMember).where(eq(adminClientGroupMember.groupId, id));
      await tx.delete(adminClientGroup).where(eq(adminClientGroup.id, id));

      await recordAudit(tx, {
        action: "client_group.delete",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId: null,
        targetType: "client_group",
        targetId: id,
        targetLabel: existing.slug,
        metadata: { name },
      });
    });

    revalidatePath("/admin/groups");
    return { success: `Group "${name}" deleted.` };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

// ── Org ↔ group membership ───────────────────────────────────────────────

export async function addOrgToGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const groupId = str(formData.get("groupId"));
  const organizationId = str(formData.get("organizationId"));
  if (!groupId) return { error: "Group id is required." };
  if (!organizationId) return { error: "Organization id is required." };

  try {
    let conflict = false;
    await withSystemBypass("super admin: add org to client group", async (tx) => {
      const [group] = await tx
        .select({
          id: adminClientGroup.id,
          slug: adminClientGroup.slug,
          name: adminClientGroup.name,
        })
        .from(adminClientGroup)
        .where(eq(adminClientGroup.id, groupId))
        .limit(1);
      if (!group) throw new Error("group not found");

      const [existing] = await tx
        .select({ id: adminClientGroupMember.id })
        .from(adminClientGroupMember)
        .where(
          and(
            eq(adminClientGroupMember.groupId, groupId),
            eq(adminClientGroupMember.organizationId, organizationId),
          ),
        )
        .limit(1);
      if (existing) {
        conflict = true;
        return;
      }

      await tx.insert(adminClientGroupMember).values({
        id: crypto.randomUUID(),
        groupId,
        organizationId,
        addedByUserId: ctx.actorId,
      });

      await recordAudit(tx, {
        action: "client_group_member.add",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "client_group",
        targetId: groupId,
        targetLabel: group.slug,
        metadata: { groupName: group.name, organizationId },
      });
    });

    if (conflict) return { error: "Organization is already in this group." };

    revalidatePath(`/admin/groups/${groupId}`);
    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: "Organization added to group." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}

export async function removeOrgFromGroupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const groupId = str(formData.get("groupId"));
  const organizationId = str(formData.get("organizationId"));
  if (!groupId) return { error: "Group id is required." };
  if (!organizationId) return { error: "Organization id is required." };

  try {
    await withSystemBypass("super admin: remove org from client group", async (tx) => {
      const [group] = await tx
        .select({
          id: adminClientGroup.id,
          slug: adminClientGroup.slug,
          name: adminClientGroup.name,
        })
        .from(adminClientGroup)
        .where(eq(adminClientGroup.id, groupId))
        .limit(1);
      if (!group) throw new Error("group not found");

      await tx
        .delete(adminClientGroupMember)
        .where(
          and(
            eq(adminClientGroupMember.groupId, groupId),
            eq(adminClientGroupMember.organizationId, organizationId),
          ),
        );

      await recordAudit(tx, {
        action: "client_group_member.remove",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "client_group",
        targetId: groupId,
        targetLabel: group.slug,
        metadata: { groupName: group.name, organizationId },
      });
    });

    revalidatePath(`/admin/groups/${groupId}`);
    revalidatePath(`/admin/organizations/${organizationId}`);
    return { success: "Organization removed from group." };
  } catch {
    return { error: GENERIC_ERROR };
  }
}