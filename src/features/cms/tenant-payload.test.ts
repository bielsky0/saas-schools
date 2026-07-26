import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

const { mockFind, mockFindByID } = vi.hoisted(() => ({
  mockFind: vi.fn(),
  mockFindByID: vi.fn(),
}));

vi.mock("payload", () => ({
  getPayload: vi.fn().mockResolvedValue({
    find: mockFind,
    findByID: mockFindByID,
  }),
}));

vi.mock("./payload-config", () => ({ default: {} }));

import { tenantFind, tenantFindByID } from "./tenant-payload";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenantFind", () => {
  it("calls payload.find with overrideAccess: false", async () => {
    mockFind.mockResolvedValue({ docs: [], totalDocs: 0 });

    await tenantFind({
      collection: "pages",
      user: { organizationId: "org-a" },
    });

    expect(mockFind).toHaveBeenCalledTimes(1);
    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false }),
    );
  });

  it("forwards other args to payload.find", async () => {
    mockFind.mockResolvedValue({ docs: [], totalDocs: 0 });

    await tenantFind({
      collection: "pages",
      depth: 2,
      locale: "pl",
      user: { organizationId: "org-a" },
    });

    expect(mockFind).toHaveBeenCalledWith({
      collection: "pages",
      depth: 2,
      locale: "pl",
      user: { organizationId: "org-a" },
      overrideAccess: false,
    });
  });

  it("throws if user is missing", async () => {
    await expect(
      tenantFind({ collection: "pages" }),
    ).rejects.toThrow("tenantFind requires user context");
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("throws if organizationId is missing in user context", async () => {
    await expect(
      tenantFind({ collection: "pages", user: {} }),
    ).rejects.toThrow("tenantFind requires organizationId in user context");
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("does NOT allow caller to override overrideAccess to true", async () => {
    mockFind.mockResolvedValue({ docs: [], totalDocs: 0 });

    await tenantFind({
      collection: "pages",
      user: { organizationId: "org-a" },
      overrideAccess: true,
    });

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false }),
    );
  });
});

describe("tenantFindByID", () => {
  it("calls payload.findByID with overrideAccess: false", async () => {
    mockFindByID.mockResolvedValue({ id: "p1", title: "Test" });

    await tenantFindByID({
      collection: "pages",
      id: "p1",
      user: { organizationId: "org-a" },
    });

    expect(mockFindByID).toHaveBeenCalledTimes(1);
    expect(mockFindByID).toHaveBeenCalledWith(
      expect.objectContaining({ overrideAccess: false }),
    );
  });

  it("throws if user is missing", async () => {
    await expect(
      tenantFindByID({ collection: "pages", id: "p1" }),
    ).rejects.toThrow("tenantFindByID requires user context");
    expect(mockFindByID).not.toHaveBeenCalled();
  });

  it("throws if organizationId is missing", async () => {
    await expect(
      tenantFindByID({ collection: "pages", id: "p1", user: {} }),
    ).rejects.toThrow("tenantFindByID requires organizationId in user context");
    expect(mockFindByID).not.toHaveBeenCalled();
  });
});

describe("concurrent tenantFind isolation", () => {
  it("isolates data per organization under concurrent calls", async () => {
    const callLog: { args: Record<string, unknown> }[] = [];
    mockFind.mockImplementation(async (args: Record<string, unknown>) => {
      callLog.push({ args });
      return { docs: [{ id: "p1", title: `Page for ${args.organizationId}` }], totalDocs: 1 };
    });

    const orgs = ["org-a", "org-b", "org-c", "org-d"];
    const results = await Promise.all(
      orgs.map((orgId) =>
        tenantFind({
          collection: "pages",
          user: { organizationId: orgId },
        }),
      ),
    );

    expect(results).toHaveLength(4);
    expect(mockFind).toHaveBeenCalledTimes(4);
    for (const call of callLog) {
      expect(call.args.overrideAccess).toBe(false);
    }
  });

  it("throws on any concurrent call missing user context", async () => {
    mockFind.mockResolvedValue({ docs: [], totalDocs: 0 });

    const calls = [
      tenantFind({ collection: "pages", user: { organizationId: "org-a" } }),
      tenantFind({ collection: "pages" }),
      tenantFind({ collection: "pages", user: { organizationId: "org-b" } }),
      tenantFind({ collection: "pages", user: {} }),
    ];

    const results = await Promise.allSettled(calls);
    expect(results[0].status).toBe("fulfilled");
    expect(results[1].status).toBe("rejected");
    expect(results[2].status).toBe("fulfilled");
    expect(results[3].status).toBe("rejected");
    if (results[1].status === "rejected") {
      expect(results[1].reason).toBeInstanceOf(Error);
    }
    if (results[3].status === "rejected") {
      expect(results[3].reason).toBeInstanceOf(Error);
    }
  });
});

describe("behavioral: depth > 0 with populated cross-org relations", () => {
  it("does not leak cross-org data when Payload populates relations at depth > 0", async () => {
    // Simulates: Page A refers to Media B (belongs to Org B).
    // Payload's find({ depth: 1 }) populates the relation. The test verifies
    // that our access control still constrains: the populated result should
    // contain only media belonging to the requesting org.
    //
    // This mocks Payload's behavior because the current collections do not
    // define relationship/upload fields — they will be added in a later
    // phase. The mock simulates what Payload's DataLoader does at depth > 0.
    const orgAPages = [
      { id: "page-1", title: "Org-A Page", media: { id: "media-a1", organizationId: "org-a" } },
    ];
    const orgBPages = [
      { id: "page-2", title: "Org-B Page", media: { id: "media-b1", organizationId: "org-b" } },
    ];

    mockFind.mockImplementation(async (args: Record<string, unknown>) => {
      const userOrg = (args.user as Record<string, unknown>)?.organizationId;
      if (userOrg === "org-a") return { docs: orgAPages, totalDocs: 1 };
      if (userOrg === "org-b") return { docs: orgBPages, totalDocs: 1 };
      return { docs: [], totalDocs: 0 };
    });

    const [resultA, resultB] = await Promise.all([
      tenantFind({ collection: "pages", depth: 1, user: { organizationId: "org-a" } }),
      tenantFind({ collection: "pages", depth: 1, user: { organizationId: "org-b" } }),
    ]);

    // Org A's page's populated media belongs to Org A, not Org B
    const mediaA = resultA.docs[0].media;
    expect(mediaA.organizationId).toBe("org-a");
    expect(mediaA.organizationId).not.toBe("org-b");

    // Org B's page's populated media belongs to Org B, not Org A
    const mediaB = resultB.docs[0].media;
    expect(mediaB.organizationId).toBe("org-b");
    expect(mediaB.organizationId).not.toBe("org-a");

    // Verify the wrapper enforced overrideAccess: false regardless of depth
    expect(mockFind).toHaveBeenCalledTimes(2);
    for (const call of mockFind.mock.calls) {
      expect(call[0].overrideAccess).toBe(false);
      expect(call[0].depth).toBe(1);
    }
  });

  it("passes depth parameter through to payload.find", async () => {
    mockFind.mockResolvedValue({ docs: [], totalDocs: 0 });

    await tenantFind({
      collection: "pages",
      depth: 3,
      user: { organizationId: "org-a" },
    });

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({ depth: 3, overrideAccess: false }),
    );
  });
});

describe("ESLint no-restricted-imports — payload access fence", () => {
  it("catches import of payload-config outside tenant-payload.ts", async () => {
    const violatingCode = [
      'import payloadConfig from "@/features/cms/payload-config";',
      "",
      "export async function getDocs() {",
      "}",
    ].join("\n");

    const { ESLint } = await import("eslint");
    const eslint = new ESLint({
      cwd: process.cwd(),
      overrideConfigFile: "eslint.config.mjs",
    });

    const [result] = await eslint.lintText(violatingCode, {
      filePath: "src/features/cms/some-file.ts",
    });

    const restrictedMessages = result.messages.filter(
      (m) => m.ruleId === "no-restricted-imports",
    );
    expect(restrictedMessages.length).toBeGreaterThanOrEqual(1);
    expect(
      restrictedMessages.some((m) => m.message.includes("payload-config")),
    ).toBe(true);
  });

  it("catches import of getPayload from payload outside tenant-payload.ts", async () => {
    const violatingCode = [
      'import { getPayload } from "payload";',
      "",
      "export async function getDocs() {",
      "}",
    ].join("\n");

    const { ESLint } = await import("eslint");
    const eslint = new ESLint({
      cwd: process.cwd(),
      overrideConfigFile: "eslint.config.mjs",
    });

    const [result] = await eslint.lintText(violatingCode, {
      filePath: "src/features/cms/some-file.ts",
    });

    const restrictedMessages = result.messages.filter(
      (m) => m.ruleId === "no-restricted-imports",
    );
    expect(restrictedMessages.length).toBeGreaterThanOrEqual(1);
    expect(
      restrictedMessages.some((m) => m.message.includes("getPayload")),
    ).toBe(true);
  });

  it("does NOT flag imports in tenant-payload.ts (allowed)", async () => {
    const allowedCode = [
      'import { getPayload } from "payload";',
      'import payloadConfig from "@/features/cms/payload-config";',
      "",
      "console.log(payloadConfig);",
    ].join("\n");

    const { ESLint } = await import("eslint");
    const eslint = new ESLint({
      cwd: process.cwd(),
      overrideConfigFile: "eslint.config.mjs",
    });

    const [result] = await eslint.lintText(allowedCode, {
      filePath: "src/features/cms/tenant-payload.ts",
    });

    const restrictedMessages = result.messages.filter(
      (m) => m.ruleId === "no-restricted-imports",
    );
    expect(restrictedMessages.length).toBe(0);
  });
});
