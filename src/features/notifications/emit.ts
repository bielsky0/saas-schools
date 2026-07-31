import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import type { JobWriter } from "@/lib/adapters/jobs";
import { enqueueEmail } from "@/features/emails/send";
import { enqueueJob } from "@/features/jobs/enqueue";
import { enqueueNotification } from "@/features/notifications/send";
import type { TemplateName } from "@/lib/adapters/email";
import { client, notificationEventType, notificationPreference } from "@/lib/db/schema";

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
): Promise<{ inAppEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean }> {
  const recipientType = recipient.kind === "staff" ? "staff" : "client";
  const recipientId = recipient.kind === "staff" ? recipient.userId : recipient.clientId;

  const [row] = await db
    .select({
      inAppEnabled: notificationPreference.inAppEnabled,
      emailEnabled: notificationPreference.emailEnabled,
      smsEnabled: notificationPreference.smsEnabled,
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

  return row ?? { inAppEnabled: true, emailEnabled: true, smsEnabled: true };
}

async function resolveClientPhone(clientId: string): Promise<string | null> {
  const [row] = await db
    .select({ phone: client.phone })
    .from(client)
    .where(eq(client.id, clientId))
    .limit(1);
  return row?.phone ?? null;
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
  // ── Faza 28 — Lesson topics and homework (EPIK 43, §2.42) ───────────
  "lesson_topic_added": "lesson-topic-added",
  "homework_assigned": "homework-assigned",
  // ── Faza 29a — Client password changed (EPIK 44, spec v19) ────────────
  "client_password_changed": "client-password-changed",
  // ── Faza 5 — Slot-first individual sessions (EPIK 34, §2.32) ──────────
  "booking-confirmed": "booking-confirmed",
  "slot-first-session-created": "slot-first-session-created",
  // ── Faza 6 — Client notification settings (EPIK 44) ───────────────────
  "session-reminder": "session-reminder",
  "session-rescheduled": "session-rescheduled",
  "invoice-available": "invoice-available",
  "individual-session-rejected": "individual-session-rejected",
  "qualification-card-reminder": "qualification-card-reminder",
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

    const useSms =
      eventType.defaultChannels.includes("sms") &&
      (eventType.isOverridable ? prefs.smsEnabled : true);

    if (!useEmail && !useInApp && !useSms) continue;

    const channelsSent: string[] = [];

    if (useEmail) {
      await enqueueEmail(
        writer,
        EMAIL_TEMPLATE_MAP[input.eventType] ?? (input.eventType as TemplateName),
        input.params as Record<string, unknown>,
        { to: recipient.email, name: recipient.name, locale: recipient.locale as any },
        { dedupeKey: `email:${input.dedupeBasis}:${recipient.email.toLowerCase()}` },
      );
      channelsSent.push("email");
    }

    if (useSms && recipient.kind === "client") {
      const phone = await resolveClientPhone(recipient.clientId);
      if (phone) {
        await enqueueJob(
          writer,
          "sms.send",
          { phone, body: input.params.message as string ?? "" },
          { dedupeKey: `sms:${input.dedupeBasis}:${phone}` },
        );
        channelsSent.push("sms");
      }
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
          channelSent: channelsSent,
        },
        { dedupeKey: `notif:${input.dedupeBasis}:${recipient.kind}:${recipientId}` },
      );
    }
  }
}
