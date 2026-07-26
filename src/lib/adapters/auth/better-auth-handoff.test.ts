import { beforeEach, describe, expect, it, vi } from "vitest";

// --- mocks ---

vi.mock("@/features/organizations/data", () => ({
  consumeStaffSessionHandoff: vi.fn(),
  hashHandoffToken: vi.fn(),
  getOrgBySubdomain: vi.fn(),
  getMembership: vi.fn(),
}));

vi.mock("@/lib/db/tenant", () => ({
  withTenant: vi.fn(),
}));

import { getMembership, getOrgBySubdomain } from "@/features/organizations/data";
import { withTenant } from "@/lib/db/tenant";

type MembershipRow = {
  id: string;
  organizationId: string;
  userId: string;
  status: string;
};

// The exact membership-check pattern used in the handoff endpoint.
// Extracted here so we can unit-test the logic without booting Better Auth.
async function checkHandoffMembership(
  subdomain: string,
  userId: string,
  mocks: {
    getOrgBySubdomain: typeof getOrgBySubdomain;
    getMembership: typeof getMembership;
    withTenant: typeof withTenant;
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const org = await mocks.getOrgBySubdomain(subdomain);
  if (!org) return { ok: false, reason: "unknown org" };

  const membership = await mocks.withTenant(org.id, async (tx) =>
    mocks.getMembership(tx, org.id, userId),
  );
  if (!membership) return { ok: false, reason: "missing membership" };
  if (membership.status !== "active") return { ok: false, reason: `status: ${membership.status}` };

  return { ok: true };
}

describe("staff handoff membership check (pattern from better-auth.ts D78)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: withTenant calls the callback with a mock tx object.
    (withTenant as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (_orgId: string, fn: (tx: unknown) => unknown) => fn({}),
    );
  });

  describe("membership status gates", () => {
    it("allows when membership is active", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-7" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-7",
        userId: "user-1",
        status: "active",
      });

      const result = await checkHandoffMembership("acme", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(result).toEqual({ ok: true });
    });

    it("denies when membership status is suspended", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-7" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-7",
        userId: "user-1",
        status: "suspended",
      });

      const result = await checkHandoffMembership("acme", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(result).toEqual({ ok: false, reason: "status: suspended" });
    });

    it("denies when membership status is invited", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-7" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "mem-1",
        organizationId: "org-7",
        userId: "user-1",
        status: "invited",
      });

      const result = await checkHandoffMembership("acme", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(result).toEqual({ ok: false, reason: "status: invited" });
    });

    it("denies when no membership record exists", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-7" });
      (getMembership as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await checkHandoffMembership("acme", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(result).toEqual({ ok: false, reason: "missing membership" });
    });

    it("denies when subdomain is unknown (no org)", async () => {
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await checkHandoffMembership("nonexistent", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(result).toEqual({ ok: false, reason: "unknown org" });
      expect(getMembership).not.toHaveBeenCalled();
    });
  });

  describe("context consistency", () => {
    it("passes the same org.id to withTenant and getMembership", async () => {
      const withTenantArgs: string[] = [];
      const membershipArgs: string[] = [];

      (withTenant as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async (orgId: string, fn: (tx: unknown) => unknown) => {
          withTenantArgs.push(orgId);
          return fn({});
        },
      );
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-42" });
      (getMembership as ReturnType<typeof vi.fn>).mockImplementation(
        (_tx: unknown, orgId: string, _userId: string) => {
          membershipArgs.push(orgId);
          return Promise.resolve({
            id: "mem-1",
            organizationId: "org-42",
            userId: "user-1",
            status: "active",
          });
        },
      );

      await checkHandoffMembership("acme", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(withTenantArgs).toEqual(["org-42"]);
      expect(membershipArgs).toEqual(["org-42"]);
      expect(withTenantArgs[0]).toBe(membershipArgs[0]);
    });

    it("calls getMembership inside withTenant", async () => {
      const callOrder: string[] = [];

      (withTenant as unknown as ReturnType<typeof vi.fn>).mockImplementation(
        async (orgId: string, fn: (tx: unknown) => unknown) => {
          callOrder.push("withTenant:" + orgId);
          return fn({});
        },
      );
      (getOrgBySubdomain as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "org-99" });
      (getMembership as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callOrder.push("getMembership");
        return Promise.resolve({
          id: "mem-1",
          organizationId: "org-99",
          userId: "user-1",
          status: "active",
        });
      });

      await checkHandoffMembership("acme", "user-1", {
        getOrgBySubdomain,
        getMembership,
        withTenant,
      });

      expect(callOrder).toEqual(["withTenant:org-99", "getMembership"]);
    });
  });
});
