import type { SmsAdapter } from "./contract";

const globalForSmsOutbox = globalThis as unknown as {
  smsOutbox: SentSms[] | undefined;
};

interface SentSms {
  to: string;
  body: string;
  sentAt: string;
}

const outbox: SentSms[] = (globalForSmsOutbox.smsOutbox ??= []);

export function getSmsOutbox(to?: string): SentSms[] {
  const all = [...outbox].reverse();
  return to ? all.filter((m) => m.to === to) : all;
}

export function clearSmsOutbox(): void {
  outbox.length = 0;
}

export const logSmsAdapter: SmsAdapter = {
  async send(phone: string, body: string): Promise<void> {
    outbox.push({ to: phone, body, sentAt: new Date().toISOString() });
    console.log(`\n[sms:log] to=${phone}\n[sms:log] body="${body}"\n`);
  },
};
