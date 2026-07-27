import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/server", () => ({
  env: { NODE_ENV: "test" },
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/lib/adapters/sms", () => ({
  sms: { send: vi.fn() },
  clearSmsOutbox: vi.fn(),
  getSmsOutbox: vi.fn().mockReturnValue([]),
}));

vi.mock("@/features/jobs/enqueue", () => ({
  enqueueJob: vi.fn(),
}));

vi.mock("@/features/jobs/runner", () => ({
  kickDrain: vi.fn(),
}));

vi.mock("@/features/organizations/context", () => ({
  requireOrgPermission: vi.fn().mockResolvedValue({
    session: { user: { id: "user-1", email: "staff@acme.pl" }, impersonatedBy: null },
    org: { id: "org-1" },
    role: "owner",
    effectivePermissions: new Set(["messages.broadcast"]),
  }),
}));

vi.mock("@/features/admin/audit", () => ({
  resolveActor: vi.fn().mockResolvedValue({
    actorType: "User",
    actorId: "user-1",
    actorEmail: "staff@acme.pl",
  }),
  recordAudit: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import type { FormState } from "@/lib/validation";
import { sendBroadcastAction } from "./broadcast-actions";

describe("sendBroadcastAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing body", async () => {
    const formData = new FormData();
    formData.set("channel", "sms");
    formData.set("audienceType", "all_clients");

    const result: FormState = await sendBroadcastAction({}, formData);
    expect(result.error).toBeDefined();
  });

  it("rejects invalid channel", async () => {
    const formData = new FormData();
    formData.set("channel", "pigeon");
    formData.set("audienceType", "all_clients");
    formData.set("body", "Hello");

    const result: FormState = await sendBroadcastAction({}, formData);
    expect(result.error).toBeDefined();
  });

  it("rejects invalid audience type", async () => {
    const formData = new FormData();
    formData.set("channel", "sms");
    formData.set("audienceType", "nonexistent");
    formData.set("body", "Hello");

    const result: FormState = await sendBroadcastAction({}, formData);
    expect(result.error).toBeDefined();
  });

  it("rejects when messages.broadcast permission is missing", async () => {
    const { requireOrgPermission } = await import("@/features/organizations/context");
    vi.mocked(requireOrgPermission).mockRejectedValueOnce(new Error("Forbidden"));

    const formData = new FormData();
    formData.set("channel", "sms");
    formData.set("audienceType", "all_clients");
    formData.set("body", "Hello");

    await expect(sendBroadcastAction({}, formData)).rejects.toThrow("Forbidden");
  });
});
