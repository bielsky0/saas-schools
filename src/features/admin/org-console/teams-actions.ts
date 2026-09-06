"use server";

import { createHash, randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { recordAudit } from "@/features/admin/audit";
import { requireSuperAdmin } from "@/features/admin/context";
import { upsertPermissionOverride } from "@/features/organizations/data";
import { invitableRole } from "@/features/organizations/schema";
import { clientEnv } from "@/lib/env/client";
import { invitation, membership, user } from "@/lib/db/schema";
import { withTenant, type TenantDb } from "@/lib/db/tenant";
import { invalid, type FormState } from "@/lib/validation";
import { teamMemberActionSchema } from "./schema";

const INVITE_ROLES = invitableRole.options;

/**
 * Org-console teams actions (apex-dashboard-plan 4.2 teams).
 *
 * A SUPER ADMIN manages the TARGET org's membership — invite (no manual
 * password: `adminAuthAdapter` has no createUser/setPassword, decision from the
 * Faza-4 kickoff), change roles, suspend members within THIS org, and grant
 * permission overrides. Every write is tenant-scoped (`withTenant(orgId)`),
 * `requireSuperAdmin()` first, audit Rule A in the same transaction.
 *
 * The invite path mirrors `inviteMemberAction`'s flow (same token format, same
 * TTL, same anti-enumeration "Invitation sent") but actors are super admins and
 * the target org comes from the URL.
 */

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, same as the org feature

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

const GENERIC_ERROR = "Something went wrong. Please try again.";
const LAST_OWNER_ERROR = "The organization must keep at least one active Owner.";
const NOT_FOUND = Object.assign(new Error("not found"), { code: "NOT_FOUND" });

function notFound(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as { code?: string }).code === "NOT_FOUND";
}

/** Count active owners (locking their rows) so concurrent demotions serialize. */
async function lockActiveOwnerCount(
  tx: TenantDb,
  organizationId: string,
): Promise<number> {
  const rows = await tx
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(
        eq(membership.organizationId, organizationId),
        eq(membership.role, "owner"),
        eq(membership.status, "active"),
      ),
    )
    .for("update");
  return rows.length;
}

const roleName = (role: string) => {
  const names: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    secretariat: "Secretariat",
    reception: "Reception",
    trainer: "Trainer",
    member: "Member",
  };
  return names[role] ?? role;
};

/**
 * Invite a member to the TARGET organization. Super-admin variant of the org
 * feature's invite: same token/TTL, but the actor is the apex super admin and
 * the target org comes from the URL (never the session).
 */
export async function inviteTeamUserAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const organizationId = str(formData.get("organizationId"));
  const email = str(formData.get("email")).trim().toLowerCase();
  const role = str(formData.get("role")) || undefined;

  if (!organizationId) return { error: "Missing organization." };
  if (!email) return { error: "Email is required." };
  if (email.length > 320) return { error: "Email is too long." };
  if (role && !INVITE_ROLES.includes(role as (typeof INVITE_ROLES)[number])) {
    return { error: "Invalid role." };
  }

  const rawToken = `${randomUUID()}${randomUUID()}`.replace(/-/g, "");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const invitedByUserId = ctx.actorId;

  await withTenant(organizationId, async (tx) => {
    // Supersede any prior pending invite so only one link is live (org feature
    // behavior, kept identical).
    await tx
      .update(invitation)
      .set({ status: "revoked" })
      .where(
        and(
          eq(invitation.organizationId, organizationId),
          eq(invitation.email, email),
          eq(invitation.status, "pending"),
        ),
      );
    const [row] = await tx
      .insert(invitation)
      .values({
        organizationId,
        email,
        role,
        tokenHash: hashToken(rawToken),
        status: "pending",
        expiresAt,
        invitedByUserId,
      })
      .returning({ id: invitation.id });

    await recordAudit(tx, {
      action: "member.invite",
      actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
      organizationId,
      targetType: "invitation",
      targetId: row!.id,
      targetLabel: email,
      metadata: { role: role ?? null },
    });
  });

  revalidatePath(`/admin/orgs/${organizationId}/console/teams`);
  const inviteUrl = `${clientEnv.NEXT_PUBLIC_APP_URL}/invitations/${rawToken}`;
  return { success: `Invitation sent. Share this link: ${inviteUrl}` };
}

/**
 * Change a member's role within the TARGET org. Replicates the org feature's
 * last-owner protection: demoting the sole active Owner is forbidden.
 */
export async function changeRoleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const parsed = teamMemberActionSchema.safeParse({
    organizationId: str(formData.get("organizationId")),
    userId: str(formData.get("userId")),
    role: str(formData.get("role")) || undefined,
    status: undefined,
  });
  if (!parsed.success) return invalid(parsed.error, GENERIC_ERROR);
  const { organizationId, userId, role } = parsed.data;
  if (!role) return { error: "Role is required." };

  try {
    await withTenant(organizationId, async (tx) => {
      const [target] = await tx
        .select()
        .from(membership)
        .where(and(eq(membership.organizationId, organizationId), eq(membership.userId, userId)))
        .for("update");
      if (!target) throw NOT_FOUND;

      if (target.role === "owner" && role !== "owner") {
        if ((await lockActiveOwnerCount(tx, organizationId)) <= 1) {
          throw Object.assign(new Error("last owner"), { code: "LAST_OWNER" });
        }
      }
      await tx
        .update(membership)
        .set({ role, updatedAt: new Date() })
        .where(eq(membership.id, target.id));

      const [targetUser] = await tx
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, target.userId))
        .limit(1);

      await recordAudit(tx, {
        action: "member.role_change",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "membership",
        targetId: target.userId,
        targetLabel: targetUser?.email ?? target.userId,
        metadata: { from: target.role, to: role },
      });
    });
  } catch (err) {
    if (notFound(err)) return { error: "Membership not found." };
    if (err instanceof Error && (err as { code?: string }).code === "LAST_OWNER") {
      return { error: LAST_OWNER_ERROR };
    }
    throw err;
  }

  revalidatePath(`/admin/orgs/${organizationId}/console/teams`);
  return { success: `Role changed to ${roleName(role)}.` };
}

/**
 * Suspend / unsuspend a member WITHIN the target org. This is membership-level:
 * it flips `membership.status` for one seat while the user account keeps working
 * elsewhere — distinct from the user-level `user.suspend` in admin/actions.ts.
 */
export async function setMemberStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();

  const parsed = teamMemberActionSchema.safeParse({
    organizationId: str(formData.get("organizationId")),
    userId: str(formData.get("userId")),
    status: str(formData.get("status")) || undefined,
    role: undefined,
  });
  if (!parsed.success) return invalid(parsed.error, GENERIC_ERROR);
  const { organizationId, userId, status } = parsed.data;
  if (!status) return { error: "Status is required." };

  try {
    await withTenant(organizationId, async (tx) => {
      const [target] = await tx
        .select()
        .from(membership)
        .where(and(eq(membership.organizationId, organizationId), eq(membership.userId, userId)))
        .for("update");
      if (!target) throw NOT_FOUND;
      if (target.role === "owner" && status === "suspended") {
        if ((await lockActiveOwnerCount(tx, organizationId)) <= 1) {
          throw Object.assign(new Error("last owner"), { code: "LAST_OWNER" });
        }
      }

      await tx
        .update(membership)
        .set({ status, updatedAt: new Date() })
        .where(eq(membership.id, target.id));

      const [targetUser] = await tx
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, target.userId))
        .limit(1);

      await recordAudit(tx, {
        action: status === "suspended" ? "member.suspend" : "member.unsuspend",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail: ctx.actorEmail },
        organizationId,
        targetType: "membership",
        targetId: target.userId,
        targetLabel: targetUser?.email ?? target.userId,
        metadata: { from: target.status, to: status },
      });
    });
  } catch (err) {
    if (notFound(err)) return { error: "Membership not found." };
    if (err instanceof Error && (err as { code?: string }).code === "LAST_OWNER") {
      return { error: LAST_OWNER_ERROR };
    }
    throw err;
  }

  revalidatePath(`/admin/orgs/${organizationId}/console/teams`);
  return {
    success: status === "suspended" ? "Member suspended." : "Member restored.",
  };
}

/**
 * Grant or revoke a permission override for a member of the target org. Delegates
 * to the org feature's `upsertPermissionOverride` (same immutability rules).
 */
export async function setMemberPermissionOverrideAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireSuperAdmin();
  const t = await getTranslations("organizations.permissions");

  const organizationId = str(formData.get("organizationId"));
  const membershipId = str(formData.get("membershipId"));
  const permissionKey = str(formData.get("permissionKey"));
  const overrideType = str(formData.get("overrideType")) as "grant" | "revoke" | "";
  const reason = str(formData.get("reason"));

  if (!organizationId || !membershipId || !permissionKey || !overrideType || !reason.trim()) {
    return { error: t("reasonRequired") };
  }
  if (overrideType !== "grant" && overrideType !== "revoke") {
    return { error: t("invalidOverrideType") };
  }

  const actorEmail = ctx.actorEmail;

  try {
    await withTenant(organizationId, async (tx) => {
      await upsertPermissionOverride(tx, {
        organizationId,
        membershipId,
        permissionKey,
        overrideType,
        reason: reason.trim(),
      });
      await recordAudit(tx, {
        action: "member_permission.override",
        actor: { actorType: "SuperAdmin", actorId: ctx.actorId, actorEmail },
        organizationId,
        targetType: "membership",
        targetId: membershipId,
        targetLabel: `${overrideType} ${permissionKey}`,
        metadata: { permissionKey, overrideType, reason: reason.trim() },
      });
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : GENERIC_ERROR };
  }

  revalidatePath(`/admin/orgs/${organizationId}/console/teams`);
  return { success: t("saved") };
}