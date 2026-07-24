import type { JobWriter } from "@/lib/adapters/jobs";
import { enqueueJob } from "@/features/jobs/enqueue";

export interface EnqueueNotificationInput {
  userId?: string;
  organizationId: string | null;
  accountId: string | null;
  type: string;
  params?: Record<string, string | number>;
  link?: string;
  recipientType?: "staff" | "client";
  recipientId?: string;
  eventType?: string;
  channelSent?: string[];
}

export interface EnqueueNotificationOptions {
  dedupeKey?: string;
}

export async function enqueueNotification(
  writer: JobWriter,
  input: EnqueueNotificationInput,
  options?: EnqueueNotificationOptions,
): Promise<void> {
  await enqueueJob(
    writer,
    "notification.create",
    {
      userId: input.userId,
      organizationId: input.organizationId,
      accountId: input.accountId,
      type: input.type,
      params: input.params ?? {},
      ...(input.link ? { link: input.link } : {}),
      ...(input.recipientType ? { recipientType: input.recipientType } : {}),
      ...(input.recipientId ? { recipientId: input.recipientId } : {}),
      ...(input.eventType ? { eventType: input.eventType } : {}),
      ...(input.channelSent ? { channelSent: input.channelSent } : {}),
    },
    options,
  );
}
