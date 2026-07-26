import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks ---

vi.mock("@/lib/adapters/auth/better-auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("@/features/organizations/data", () => ({
  getOrgBySubdomain: vi.fn(),
  getMembership: vi.fn(),
}));

vi.mock("@/lib/db/tenant", () => ({
  withTenant: vi.fn(),
}));

import { auth } from "@/lib/adapters/auth/better-auth";
import { getOrgBySubdomain, getMembership } from "@/features/organizations/data";
import { withTenant } from "@/lib/db/tenant";
import { betterAuthPayloadStrategy } from "./payload-auth-strategy";

const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;

type AuthenticateArgs = Parameters<typeof betterAuthPayloadStrategy.authenticate>[0];

function makeHeaders(headers?: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers ?? {})) h.set(k, v);
  return h;
}

function callAuth(overrides?: Partial<AuthenticateArgs>) {
  const req = {} as Record<string, unknown>;
  const defaults: AuthenticateArgs = {
    headers: makeHeaders(),
    req: req as never,
    payload: {} as never,
  };
  return betterAuthPayloadStrategy.authenticate({ ...defaults, ...overrides });
}

describe("betterAuthPayloadStrategy.authenticate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: withTenant calls the callback with a fake tx.
    (withTenant as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (_orgId: string, fn: (tx: unknown) => unknown) => fn({}),
    );
  });

  it("returns { user: null } when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await callAuth();

    expect(result).toEqual({ user: null });
    expect(getOrgBySubdomain).not.toHaveBeenCalled();
  });

  it("returns user with undefined organizationId on apex (no x-org-subdomain)", async () => {
    mockGetSession.mockResolvedValue({ user: { id: "user-1", email: "a@a.com" } });

    const result = await callAuth();

    expect(result).not.toBeNull();
    expect(result!.user).toMatchObject({ id: "user-1", email: "a@a.com" });
    expect((result!.user as Record<string, unknown>).organizationId).toBeUndefined();
    expect(getOrgBySubdomain).not.toHaveBeenCalled();
  });

  describe("with x-org-subdomain header", () => {
    beforeEach(() => {
      mockGetSession.mockResolvedValue({ user: { id: "user-1", email: "a@a.com" } });
    });

    it("returns user with organizationId when membership is active", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-42",
        userId: "user-1",
        status: "active",
      });

      const result = await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }) });

      expect(result).not.toBeNull();
      expect((result!.user as Record<string, unknown>).organizationId).toBe("org-42");
    });

    it("returns { user: null } when membership status is suspended", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-42",
        userId: "user-1",
        status: "suspended",
      });

      const result = await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }) });

      expect(result).toEqual({ user: null });
    });

    it("returns { user: null } when membership status is invited", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-42",
        userId: "user-1",
        status: "invited",
      });

      const result = await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }) });

      expect(result).toEqual({ user: null });
    });

    it("returns { user: null } when no membership record exists", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }) });

      expect(result).toEqual({ user: null });
    });

    it("returns user with undefined organizationId when subdomain is unknown", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await callAuth({ headers: makeHeaders({ "x-org-subdomain": "nonexistent" }) });

      expect((result!.user as Record<string, unknown>).organizationId).toBeUndefined();
      expect(getMembership).not.toHaveBeenCalled();
    });

    it("passes the same org.id to withTenant and getMembership", async () => {
      const capturedWithTenantArgs: string[] = [];
      const capturedMembershipArgs: string[] = [];

      (withTenant as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async (orgId: string, fn: (tx: unknown) => unknown) => {
          capturedWithTenantArgs.push(orgId);
          return fn({});
        },
      );
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockImplementation(
        (_tx: unknown, orgId: string, _userId: string) => {
          capturedMembershipArgs.push(orgId);
          return Promise.resolve({ id: "mem-1", organizationId: "org-42", userId: "user-1", status: "active" });
        },
      );

      await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }) });

      expect(capturedWithTenantArgs).toEqual(["org-42"]);
      expect(capturedMembershipArgs).toEqual(["org-42"]);
      // Both receive the same org.id — no RLS mismatch possible
      expect(capturedWithTenantArgs[0]).toBe(capturedMembershipArgs[0]);
    });

    it("sets req.organizationId for downstream access control", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-42",
        userId: "user-1",
        status: "active",
      });

      const req: Record<string, unknown> = {};
      await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }), req: req as never });

      expect(req.organizationId).toBe("org-42");
    });

    it("does NOT set req.organizationId when membership is missing", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const req: Record<string, unknown> = {};
      await callAuth({ headers: makeHeaders({ "x-org-subdomain": "acme" }), req: req as never });

      expect(req.organizationId).toBeUndefined();
    });

    it("req.organizationId is undefined (not '') for apex — fail-closed in access control", async () => {
      const req: Record<string, unknown> = {};
      await callAuth({ req: req as never });

      expect(req.organizationId).toBeUndefined();
    });
  });

  describe("withTenant context consistency", () => {
    it("getMembership runs inside withTenant(org.id, ...)", async () => {
      let callOrder: string[] = [];

      (withTenant as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async (orgId: string, fn: (tx: unknown) => unknown) => {
          callOrder.push("withTenant:" + orgId);
          return fn({});
        },
      );
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-99" });
      (getMembership as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push("getMembership");
        return Promise.resolve({ id: "mem-1", organizationId: "org-99", userId: "user-1", status: "active" });
      });

      await callAuth({ headers: makeHeaders({ "x-org-subdomain": "test" }) });

      expect(callOrder).toEqual(["withTenant:org-99", "getMembership"]);
    });
  });
});
