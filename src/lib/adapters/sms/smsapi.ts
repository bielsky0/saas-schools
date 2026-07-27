import type { SmsAdapter, SmsProviderConfig } from "./contract";

export function createSmsApiAdapter(config: SmsProviderConfig): SmsAdapter {
  if (!config.apiKey) {
    throw new Error(
      "SMS_PROVIDER=smsapi requires SMSAPI_API_KEY. Set it or use SMS_PROVIDER=log.",
    );
  }

  const senderName = config.senderName ?? "Info";

  return {
    async send(phone: string, body: string): Promise<void> {
      const response = await fetch("https://api.smsapi.pl/sms.do", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          to: phone,
          message: body,
          from: senderName,
          format: "json",
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`SMSAPI.pl send failed: ${response.status} ${errorBody}`);
      }
    },
  };
}
