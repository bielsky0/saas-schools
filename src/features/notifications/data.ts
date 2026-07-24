import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import type { JobWriter } from "@/lib/adapters/jobs";
import type { Owner, TenantDb } from "@/lib/db/tenant";
import { notification, notificationPreference } from "@/lib/db/schema";
import { isSuppressibleType, type NotificationType } from "./types";

/**
 * Notifications data-access layer (spec 23.1 / 11.2 — tenant-scoped queries).
 *
 * Every read/write is scoped by BOTH the recipient (`userId`) and the tenant
 * owner (org or personal account), so a user can only ever see or clear their own
 * notifications in the context they are acting as — isolation enforced here, not
 * in the UI (the same invariant as `features/storage/data.ts`). A caller resolves
 * WHICH owner via `resolveNotificationOwner` and passes it as a `NotificationOwner`.
 */

/**
 * The tenant a notification operation acts as. Exactly one owner, mirroring the XOR.
 *
 * An alias of the canonical `Owner` since F1a — the same value now also selects
 * the RLS policy branch, so it must be the one type `withOwner` accepts.
 */
export type NotificationOwner = Owner;

/** The owner predicate — an org notification by org id, a personal one by account id. */
function ownerWhere(owner: NotificationOwner): SQL {
  return owner.kind === "organization"
    ? eq(notification.organizationId, owner.organizationId)
    : eq(notification.accountId, owner.accountId);
}

/** Columns to persist on the owner, spread into an insert. */
function ownerColumns(owner: NotificationOwner): { organizationId?: string; accountId?: string } {
  return owner.kind === "organization"
    ? { organizationId: owner.organizationId }
    : { accountId: owner.accountId };
}

export type NewNotification = {
  userId?: string;
  owner: NotificationOwner;
  type: string;
  params: Record<string, string | number>;
  link?: string;
  /** F14 — polymorphic recipient metadata. */
  recipientType?: "staff" | "client";
  recipientId?: string;
  eventType?: string;
  channelSent?: string[];
};

export async function createNotification(writer: JobWriter, input: NewNotification): Promise<void> {
  await writer.insert(notification).values({
    ...(input.userId ? { userId: input.userId } : {}),
    ...ownerColumns(input.owner),
    type: input.type,
    params: input.params,
    ...(input.link ? { link: input.link } : {}),
    ...(input.recipientType ? { recipientType: input.recipientType } : {}),
    ...(input.recipientId ? { recipientId: input.recipientId } : {}),
    ...(input.eventType ? { eventType: input.eventType } : {}),
    ...(input.channelSent ? { channelSent: input.channelSent } : {}),
  });
}

export type NotificationRow = {
  id: string;
  type: string;
  params: Record<string, string | number>;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** A recipient's notifications in one context, newest first (the bell list). */
export async function listNotificationsForUser(
  tx: TenantDb,
  userId: string,
  owner: NotificationOwner,
  limit = 20,
): Promise<NotificationRow[]> {
  const rows = await tx
    .select({
      id: notification.id,
      type: notification.type,
      params: notification.params,
      link: notification.link,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(and(eq(notification.userId, userId), ownerWhere(owner)))
    .orderBy(desc(notification.createdAt))
    .limit(limit);
  return rows;
}

/** Unread count for the bell badge (the unread predicate is `readAt IS NULL`). */
export async function countUnread(
  tx: TenantDb,
  userId: string,
  owner: NotificationOwner,
): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(notification)
    .where(and(eq(notification.userId, userId), ownerWhere(owner), isNull(notification.readAt)));
  return row?.n ?? 0;
}

/** Mark one notification read (owner + recipient scoped). False if not theirs. */
export async function markRead(
  tx: TenantDb,
  userId: string,
  owner: NotificationOwner,
  id: string,
): Promise<boolean> {
  const rows = await tx
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.id, id),
        eq(notification.userId, userId),
        ownerWhere(owner),
        isNull(notification.readAt),
      ),
    )
    .returning({ id: notification.id });
  return rows.length > 0;
}

/** Mark every unread notification in this context read. */
export async function markAllRead(
  tx: TenantDb,
  userId: string,
  owner: NotificationOwner,
): Promise<void> {
  await tx
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, userId), ownerWhere(owner), isNull(notification.readAt)));
}

/**
 * Whether the in-app channel is OFF for this user + type — the authoritative
 * check the handler runs before writing a notification (spec 23 criterion).
 *
 * A non-suppressible type (a §23.3 security notice) short-circuits to `false`
 * without a query: no preference row can ever silence it, by construction.
 * Absence of a row means the default, which is enabled.
 */
export async function isInAppSuppressed(userId: string, type: string): Promise<boolean> {
  if (!isSuppressibleType(type)) return false;
  // Check new-style preference (recipient_type + event_type)
  const [newRow] = await db
    .select({ inAppEnabled: notificationPreference.inAppEnabled })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.recipientType, "staff"),
        eq(notificationPreference.recipientId, userId),
        eq(notificationPreference.eventType, type),
      ),
    )
    .limit(1);
  if (newRow) return !newRow.inAppEnabled;

  // Fallback to old-style preference (userId + type) for backward compat
  const [oldRow] = await db
    .select({ inAppEnabled: notificationPreference.inAppEnabled })
    .from(notificationPreference)
    .where(and(eq(notificationPreference.userId, userId), eq(notificationPreference.type, type)))
    .limit(1);
  return oldRow ? !oldRow.inAppEnabled : false;
}

export type PreferenceRow = { type: string; inAppEnabled: boolean };

/** Every stored preference for a user (deviations from the default). */
export async function listPreferences(userId: string): Promise<PreferenceRow[]> {
  return db
    .select({
      type: notificationPreference.type,
      inAppEnabled: notificationPreference.inAppEnabled,
    })
    .from(notificationPreference)
    .where(eq(notificationPreference.userId, userId));
}

/** F14 — client notification rows (recipient_type = 'client'). */
export async function listClientNotifications(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
  limit = 20,
): Promise<NotificationRow[]> {
  const rows = await tx
    .select({
      id: notification.id,
      type: notification.type,
      params: notification.params,
      link: notification.link,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    })
    .from(notification)
    .where(
      and(
        eq(notification.organizationId, organizationId),
        eq(notification.recipientType, "client"),
        eq(notification.recipientId, clientId),
      ),
    )
    .orderBy(desc(notification.createdAt))
    .limit(limit);
  return rows;
}

export async function countClientUnread(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
): Promise<number> {
  const [row] = await tx
    .select({ n: count() })
    .from(notification)
    .where(
      and(
        eq(notification.organizationId, organizationId),
        eq(notification.recipientType, "client"),
        eq(notification.recipientId, clientId),
        isNull(notification.readAt),
      ),
    );
  return row?.n ?? 0;
}

export async function markClientRead(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
  id: string,
): Promise<boolean> {
  const rows = await tx
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.id, id),
        eq(notification.organizationId, organizationId),
        eq(notification.recipientType, "client"),
        eq(notification.recipientId, clientId),
        isNull(notification.readAt),
      ),
    )
    .returning({ id: notification.id });
  return rows.length > 0;
}

export async function markAllClientRead(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
): Promise<void> {
  await tx
    .update(notification)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notification.organizationId, organizationId),
        eq(notification.recipientType, "client"),
        eq(notification.recipientId, clientId),
        isNull(notification.readAt),
      ),
    );
}

/** F14 — client notification preferences. */
export async function listClientPreferences(
  clientId: string,
  organizationId: string,
): Promise<{ type: string; inAppEnabled: boolean }[]> {
  const rows = await db
    .select({
      type: notificationPreference.eventType,
      inAppEnabled: notificationPreference.inAppEnabled,
    })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.recipientType, "client"),
        eq(notificationPreference.recipientId, clientId),
      ),
    );
  return rows.filter((r): r is { type: string; inAppEnabled: boolean } => r.type !== null);
}

export async function setClientPreference(
  organizationId: string,
  clientId: string,
  eventType: string,
  inAppEnabled: boolean,
  emailEnabled: boolean,
): Promise<void> {
  await db
    .insert(notificationPreference)
    .values({
      userId: "",
      type: eventType,
      recipientType: "client",
      recipientId: clientId,
      eventType,
      inAppEnabled,
      emailEnabled,
    })
    .onConflictDoUpdate({
      target: [notificationPreference.recipientType, notificationPreference.recipientId, notificationPreference.eventType],
      set: { inAppEnabled, emailEnabled, updatedAt: new Date() },
    });
}

/** Upsert one preference (unique on user+type), stamping `updatedAt`. */
export async function setPreference(
  userId: string,
  type: NotificationType,
  inAppEnabled: boolean,
): Promise<void> {
  await db
    .insert(notificationPreference)
    .values({
      userId,
      type,
      inAppEnabled,
      recipientType: "staff",
      recipientId: userId,
      eventType: type,
    })
    .onConflictDoUpdate({
      target: [notificationPreference.userId, notificationPreference.type],
      set: { inAppEnabled, updatedAt: new Date(), recipientType: "staff", recipientId: userId, eventType: type },
    });
}
