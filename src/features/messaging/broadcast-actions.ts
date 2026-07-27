"use server";

import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { enqueueJob } from "@/features/jobs/enqueue";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import {
  athlete,
  booking,
  classSession,
  client,
  groupType,
  organizationSmsCredit,
} from "@/lib/db/schema";
import { broadcastMessage } from "@/lib/db/schema/broadcast-message";
import type { FormState } from "@/lib/validation";

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

type Channel = "sms" | "email";
type AudienceType = "group_type" | "session" | "all_clients";

interface ResolvedRecipient {
  clientId: string;
  phone: string | null;
  email: string;
  name: string | null;
}

async function resolveAudience(
  tx: Parameters<typeof withTenant>[1] extends (tx: infer T) => Promise<unknown> ? T : never,
  orgId: string,
  audienceType: AudienceType,
  audienceRefId: string | null,
  channel: Channel,
): Promise<ResolvedRecipient[]> {
  const phoneFilter = channel === "sms" ? isNotNull(client.phone) : undefined;

  if (audienceType === "all_clients") {
    const rows = await tx
      .select({
        clientId: client.id,
        phone: client.phone,
        email: client.email,
        name: client.name,
      })
      .from(client)
      .where(
        and(
          eq(client.organizationId, orgId),
          eq(client.smsOptOut, false),
          phoneFilter,
        ),
      );
    return rows;
  }

  if (audienceType === "group_type" && audienceRefId) {
    const rows = await tx
      .select({
        clientId: client.id,
        phone: client.phone,
        email: client.email,
        name: client.name,
      })
      .from(booking)
      .innerJoin(athlete, eq(athlete.id, booking.athleteId))
      .innerJoin(client, eq(client.id, athlete.parentClientId))
      .innerJoin(classSession, eq(classSession.id, booking.sessionId))
      .where(
        and(
          eq(client.organizationId, orgId),
          eq(client.smsOptOut, false),
          eq(classSession.groupTypeId, audienceRefId),
          ne(booking.paymentStatus, "cancelled"),
          phoneFilter,
        ),
      )
      .groupBy(client.id, client.phone, client.email, client.name);
    return rows;
  }

  if (audienceType === "session" && audienceRefId) {
    const rows = await tx
      .select({
        clientId: client.id,
        phone: client.phone,
        email: client.email,
        name: client.name,
      })
      .from(booking)
      .innerJoin(athlete, eq(athlete.id, booking.athleteId))
      .innerJoin(client, eq(client.id, athlete.parentClientId))
      .where(
        and(
          eq(client.organizationId, orgId),
          eq(client.smsOptOut, false),
          eq(booking.sessionId, audienceRefId),
          ne(booking.paymentStatus, "cancelled"),
          phoneFilter,
        ),
      )
      .groupBy(client.id, client.phone, client.email, client.name);
    return rows;
  }

  return [];
}

export async function sendBroadcastAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("messages.broadcast");

  const channel = str(formData.get("channel")) as Channel;
  const audienceType = str(formData.get("audienceType")) as AudienceType;
  const audienceRefId = str(formData.get("audienceRefId")) || null;
  const body = str(formData.get("body"));

  if (!body) {
    return { error: "Message body is required" };
  }
  if (channel !== "sms" && channel !== "email") {
    return { error: "Invalid channel" };
  }
  if (!["group_type", "session", "all_clients"].includes(audienceType)) {
    return { error: "Invalid audience type" };
  }

  const actor = await resolveActor(ctx.session);

  try {
    await withTenant(ctx.org.id, async (tx) => {
      const recipients = await resolveAudience(tx, ctx.org.id, audienceType, audienceRefId, channel);

      if (recipients.length === 0) {
        throw new Error("No recipients match the selected audience");
      }

      if (channel === "sms") {
        const [credit] = await tx
          .select({ balance: organizationSmsCredit.balance })
          .from(organizationSmsCredit)
          .where(eq(organizationSmsCredit.organizationId, ctx.org.id))
          .for("update");

        const balance = credit?.balance ?? 0;
        if (balance < recipients.length) {
          throw new Error(
            `Insufficient SMS credit: ${recipients.length} required, ${balance} available`,
          );
        }

        await tx
          .update(organizationSmsCredit)
          .set({
            balance: sql`balance - ${recipients.length}`,
            updatedAt: new Date(),
          })
          .where(eq(organizationSmsCredit.organizationId, ctx.org.id));

        const [msg] = await tx
          .insert(broadcastMessage)
          .values({
            organizationId: ctx.org.id,
            channel: "sms",
            audienceType,
            audienceRefId,
            body,
            recipientCount: recipients.length,
            sentByUserId: ctx.session.user.id,
          })
          .returning();

        if (!msg) throw new Error("Failed to record broadcast message");

        await recordAudit(tx, {
          action: "broadcast.sent",
          actor,
          organizationId: ctx.org.id,
          targetType: "broadcast_message",
          targetId: msg.id,
          targetLabel: `sms:${recipients.length} recipients`,
          metadata: { recipientCount: recipients.length, channel: "sms", audienceType },
        });

        for (const r of recipients) {
          if (r.phone) {
            await enqueueJob(tx, "sms.send", {
              phone: r.phone,
              body,
              broadcastMessageId: msg.id,
            });
          }
        }
      } else {
        const [msg] = await tx
          .insert(broadcastMessage)
          .values({
            organizationId: ctx.org.id,
            channel: "email",
            audienceType,
            audienceRefId,
            body,
            recipientCount: recipients.length,
            sentByUserId: ctx.session.user.id,
          })
          .returning();

        if (!msg) throw new Error("Failed to record broadcast message");

        await recordAudit(tx, {
          action: "broadcast.sent",
          actor,
          organizationId: ctx.org.id,
          targetType: "broadcast_message",
          targetId: msg.id,
          targetLabel: `email:${recipients.length} recipients`,
          metadata: { recipientCount: recipients.length, channel: "email", audienceType },
        });
      }
    });

    revalidatePath("/staff/messaging");
    return { success: "OK" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Broadcast failed" };
  }
}
