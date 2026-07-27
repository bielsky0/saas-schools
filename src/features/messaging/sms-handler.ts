import { z } from "zod";

import { sms } from "@/lib/adapters/sms";
import type { JobHandler } from "@/lib/adapters/jobs";

const smsJobSchema = z.object({
  phone: z.string().min(1),
  body: z.string().min(1),
  broadcastMessageId: z.string().optional(),
});

export const smsSendHandler: JobHandler<"sms.send"> = async (payload) => {
  const p = smsJobSchema.parse(payload);
  await sms.send(p.phone, p.body);
};
