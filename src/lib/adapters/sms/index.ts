import { env } from "@/lib/env/server";
import type { SmsAdapter } from "./contract";
import { logSmsAdapter } from "./log";
import { createSmsApiAdapter } from "./smsapi";

function createSmsAdapter(): SmsAdapter {
  switch (env.SMS_PROVIDER) {
    case "smsapi":
      return createSmsApiAdapter({
        apiKey: env.SMSAPI_API_KEY ?? "",
        senderName: env.SMSAPI_SENDER_NAME ?? "",
      });
    case "log":
    default:
      return logSmsAdapter;
  }
}

export const sms: SmsAdapter = createSmsAdapter();

export type { SmsAdapter } from "./contract";
export { getSmsOutbox, clearSmsOutbox } from "./log";
