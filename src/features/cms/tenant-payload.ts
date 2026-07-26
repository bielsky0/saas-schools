import { getPayload } from "payload";
import { db } from "@/lib/db";

import payloadConfig from "./payload-config";

export { db };

interface PayloadInstance {
  find: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  findByID: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

let _payload: PayloadInstance | null = null;

async function getInstance(): Promise<PayloadInstance> {
  if (!_payload) {
    _payload = (await getPayload({ config: payloadConfig })) as PayloadInstance;
  }
  return _payload;
}

export async function tenantFind<T = Record<string, unknown>>(
  args: {
    collection: string;
    depth?: number;
    locale?: string;
    fallbackLocale?: string;
    user?: Record<string, unknown>;
    overrideAccess?: boolean;
    [key: string]: unknown;
  },
): Promise<T> {
  if (!args.user) {
    throw new Error("tenantFind requires user context — set `user` from req.user");
  }
  if (!args.user.organizationId) {
    throw new Error("tenantFind requires organizationId in user context");
  }
  const payload = await getInstance();
  return payload.find({
    ...args,
    overrideAccess: false,
  }) as Promise<T>;
}

export async function tenantFindByID<T = Record<string, unknown>>(
  args: {
    collection: string;
    id: string;
    depth?: number;
    locale?: string;
    fallbackLocale?: string;
    user?: Record<string, unknown>;
    overrideAccess?: boolean;
    [key: string]: unknown;
  },
): Promise<T> {
  if (!args.user) {
    throw new Error("tenantFindByID requires user context — set `user` from req.user");
  }
  if (!args.user.organizationId) {
    throw new Error("tenantFindByID requires organizationId in user context");
  }
  const payload = await getInstance();
  return payload.findByID({
    ...args,
    overrideAccess: false,
  }) as Promise<T>;
}
