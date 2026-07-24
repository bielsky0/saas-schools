import type { JobHandler } from "@/lib/adapters/jobs";
import { withOwner } from "@/lib/db/tenant";
import { createLogger } from "@/lib/logger";
import { createNotification, isInAppSuppressed, type NotificationOwner } from "./data";
import { notificationJobSchema } from "./schema";

const log = createLogger("notification");

export const notificationCreateHandler: JobHandler<"notification.create"> = async (payload) => {
  const p = notificationJobSchema.parse(payload);

  const recipientType = p.recipientType ?? "staff";
  const recipientId = p.recipientId ?? p.userId;

  if (recipientType === "staff" && p.userId) {
    if (await isInAppSuppressed(p.userId, p.type)) {
      log.info("suppressed", { userId: p.userId, type: p.type });
      return;
    }
  }

  const owner: NotificationOwner = p.organizationId
    ? { kind: "organization", organizationId: p.organizationId }
    : { kind: "personal", accountId: p.accountId! };

  await withOwner(owner, (tx) =>
    createNotification(tx, {
      userId: p.userId,
      owner,
      type: p.type,
      params: p.params,
      ...(p.link ? { link: p.link } : {}),
      recipientType: recipientType as "staff" | "client",
      recipientId,
      eventType: p.eventType ?? p.type,
      channelSent: p.channelSent ?? ["in_app"],
    }),
  );
};
