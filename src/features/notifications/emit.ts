import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { JobWriter } from "@/lib/adapters/jobs";
import { enqueueEmail } from "@/features/emails/send";
import { enqueueNotification } from "@/features/notifications/send";
import type { TemplateName } from "@/lib/adapters/email";
import { notificationEventType, notificationPreference } from "@/lib/db/schema";

export type DomainNotificationRecipient =
  | { kind: "staff"; userId: string; email: string; name?: string; locale: string }
  | { kind: "client"; clientId: string; email: string; name?: string; locale: string };

export interface DomainNotificationInput {
  eventType: string;
  organizationId: string | null;
  accountId: string | null;
  recipients: DomainNotificationRecipient[];
  params: Record<string, string | number>;
  link?: string;
  dedupeBasis: string;
}

async function readEventType(eventType: string) {
  const [row] = await db
    .select({
      defaultChannels: notificationEventType.defaultChannels,
      isOverridable: notificationEventType.isOverridable,
    })
    .from(notificationEventType)
    .where(eq(notificationEventType.code, eventType))
    .limit(1);
  return row ?? { defaultChannels: ["email", "in_app"] as string[], isOverridable: true };
}

async function readPreference(
  eventType: string,
  recipient: DomainNotificationRecipient,
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean }> {
  const recipientType = recipient.kind === "staff" ? "staff" : "client";
  const recipientId = recipient.kind === "staff" ? recipient.userId : recipient.clientId;

  const [row] = await db
    .select({
      inAppEnabled: notificationPreference.inAppEnabled,
      emailEnabled: notificationPreference.emailEnabled,
    })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.recipientType, recipientType),
        eq(notificationPreference.recipientId, recipientId),
        eq(notificationPreference.eventType, eventType),
      ),
    )
    .limit(1);

  return row ?? { inAppEnabled: true, emailEnabled: true };
}

const EMAIL_TEMPLATE_MAP: Record<string, TemplateName> = {
  "booking-cancelled": "booking-cancelled",
  "session-cancelled": "session-cancelled",
  "grade-recorded": "grade-recorded",
  "progress-note-added": "progress-note-added",
  "plan_limit_approaching": "plan_limit_approaching",
  "plan_limit_reached": "plan_limit_reached",
  "subscription-payment-failed": "subscription-payment-failed",
  "payment-failed": "payment-failed",
  "subscription-confirmed": "subscription-confirmed",
  "verify-email": "verify-email",
  invitation: "invitation",
  "client-otp": "client-otp",
  "password-reset": "password-reset",
  // ── Faza 15 — Group swap ────────────────────────────────────────────
  "group-change-approved": "group-change-approved",
  "group-change-rejected": "group-change-rejected",
  "group-change-pending-payment": "group-change-pending-payment",
  "group-change-expired": "group-change-expired",
  "group-change-cancelled": "group-change-cancelled",
  "group-change-completed": "group-change-completed",
  // ── Faza 15 — Credit transfer ───────────────────────────────────────
  "credit-transfer-completed": "credit-transfer-completed",
  // ── Faza 16 — Zwroty fiducjarne (EPIK 18) ──────────────────────────
  "refund-confirmed": "refund-confirmed",
};

const EVENT_TYPES_WITH_EMAIL = new Set(Object.keys(EMAIL_TEMPLATE_MAP));

export async function emitDomainNotification(
  writer: JobWriter,
  input: DomainNotificationInput,
): Promise<void> {
  const eventType = await readEventType(input.eventType);

  for (const recipient of input.recipients) {
    const prefs = await readPreference(input.eventType, recipient);

    const useEmail =
      eventType.defaultChannels.includes("email") &&
      (eventType.isOverridable ? prefs.emailEnabled : true) &&
      EVENT_TYPES_WITH_EMAIL.has(input.eventType);

    const useInApp =
      eventType.defaultChannels.includes("in_app") &&
      (eventType.isOverridable ? prefs.inAppEnabled : true);

    if (!useEmail && !useInApp) continue;

    if (useEmail) {
      await enqueueEmail(
        writer,
        EMAIL_TEMPLATE_MAP[input.eventType] ?? (input.eventType as TemplateName),
        input.params as Record<string, unknown>,
        { to: recipient.email, name: recipient.name, locale: recipient.locale as any },
        { dedupeKey: `email:${input.dedupeBasis}:${recipient.email.toLowerCase()}` },
      );
    }

    if (useInApp) {
      const owner = input.organizationId
        ? { organizationId: input.organizationId, accountId: null }
        : { organizationId: null, accountId: input.accountId };

      const recipientId = recipient.kind === "staff" ? recipient.userId : recipient.clientId;

      await enqueueNotification(
        writer,
        {
          ...(recipient.kind === "staff" ? { userId: recipient.userId } : {}),
          organizationId: owner.organizationId,
          accountId: owner.accountId,
          type: input.eventType,
          params: input.params,
          ...(input.link ? { link: input.link } : {}),
          recipientType: recipient.kind,
          recipientId,
          eventType: input.eventType,
          channelSent: ["in_app"],
        },
        { dedupeKey: `notif:${input.dedupeBasis}:${recipient.kind}:${recipientId}` },
      );
    }
  }
}
