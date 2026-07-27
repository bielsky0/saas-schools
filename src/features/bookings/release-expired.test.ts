import { describe, expect, it } from "vitest";

import { PENDING_PAYMENT_TTL_MS, toBatchMap } from "./release-expired.constants";

describe("PENDING_PAYMENT_TTL_MS", () => {
  it("equals 15 minutes in milliseconds", () => {
    expect(PENDING_PAYMENT_TTL_MS).toBe(15 * 60 * 1000);
  });
});

describe("toBatchMap", () => {
  it("groups rows by organizationId", () => {
    const rows = [
      { id: "a1", organizationId: "org-a" },
      { id: "a2", organizationId: "org-a" },
      { id: "b1", organizationId: "org-b" },
    ];
    const map = toBatchMap(rows);
    expect([...map.keys()]).toEqual(["org-a", "org-b"]);
    expect(map.get("org-a")).toEqual(["a1", "a2"]);
    expect(map.get("org-b")).toEqual(["b1"]);
  });

  it("returns empty map for empty input", () => {
    const map = toBatchMap([]);
    expect(map.size).toBe(0);
  });

  it("handles single organization", () => {
    const map = toBatchMap([{ id: "x", organizationId: "org-x" }]);
    expect(map.get("org-x")).toEqual(["x"]);
  });
});
