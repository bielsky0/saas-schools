import { z } from "zod";

import { idParam } from "@/lib/validation";

export const notificationJobSchema = z
  .object({
    userId: z.string().optional(),
    organizationId: z.string().nullable(),
    accountId: z.string().nullable(),
    type: z.string().min(1),
    params: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
    link: z.string().optional(),
    recipientType: z.enum(["staff", "client"]).optional(),
    recipientId: z.string().optional(),
    eventType: z.string().optional(),
    channelSent: z.array(z.string()).optional(),
  })
  .refine((v) => (v.organizationId === null) !== (v.accountId === null), {
    message: "exactly one of organizationId / accountId must be set",
    path: ["organizationId"],
  });

export const markReadSchema = z.object({
  id: idParam,
});
