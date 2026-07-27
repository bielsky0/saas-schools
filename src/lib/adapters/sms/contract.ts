export interface SmsAdapter {
  send(phone: string, body: string): Promise<void>;
}

export interface SmsProviderConfig {
  apiKey: string;
  senderName: string | undefined;
}
