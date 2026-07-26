import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env/server", () => ({
  env: { NODE_ENV: "production" },
}));

vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/tenant", () => ({ withTenant: vi.fn() }));
vi.mock("@/lib/db/system", () => ({ withSystemBypass: vi.fn() }));
vi.mock("../sql-error", () => ({ sqlStateOf: vi.fn() }));

import { POST } from "@/app/api/dev/cms-isolation-probe/route";

function mockRequest(body: Record<string, unknown>) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

describe("/api/dev/cms-isolation-probe production guard", () => {
  it("returns 404 when NODE_ENV is production", async () => {
    const response = await POST(mockRequest({ action: "probe", organizationId: "org-a" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Not found" });
  });

  it("returns 404 for seed action too", async () => {
    const response = await POST(mockRequest({ action: "seed", organizationId: "org-a" }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Not found" });
  });
});
