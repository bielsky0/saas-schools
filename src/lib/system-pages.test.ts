import { describe, expect, it } from "vitest";

import {
  defaultSystemPages,
  isDeletableSystemPage,
  isSystemPageTypeKey,
  SYSTEM_PAGE_DEFINITIONS,
  SYSTEM_PAGE_TYPE_KEYS,
  SYSTEM_PAGE_TYPE_NAMES,
  SYSTEM_PAGE_TYPES,
} from "./system-pages";

const isChaiBlock = (block: Record<string, unknown>): boolean =>
  typeof block._id === "string" && typeof block._type === "string";

describe("system-pages registry", () => {
  it("registers only the 404 system page type", () => {
    expect(SYSTEM_PAGE_TYPE_KEYS).toEqual(["system_404"]);
  });

  it("maps every registered type to a display label", () => {
    for (const key of SYSTEM_PAGE_TYPE_KEYS) {
      expect(SYSTEM_PAGE_TYPE_NAMES[key]).toBeTruthy();
    }
  });

  it("exposes the notFound constant matching the registry", () => {
    expect(SYSTEM_PAGE_TYPES.notFound).toBe("system_404");
  });

  it("isSystemPageTypeKey matches only registered types", () => {
    for (const key of SYSTEM_PAGE_TYPE_KEYS) {
      expect(isSystemPageTypeKey(key)).toBe(true);
    }
    // Enrollment pages are NOT system pages (F2 collection model).
    expect(isSystemPageTypeKey("enrollment_detail")).toBe(false);
    expect(isSystemPageTypeKey("enrollment_template")).toBe(false);
    expect(isSystemPageTypeKey("page")).toBe(false);
    expect(isSystemPageTypeKey("template")).toBe(false);
    expect(isSystemPageTypeKey("blog_index")).toBe(false);
  });

  it("isDeletableSystemPage is false for every registered type by default", () => {
    for (const key of SYSTEM_PAGE_TYPE_KEYS) {
      expect(isDeletableSystemPage(key)).toBe(false);
    }
    // Unknown types are treated as deletable.
    expect(isDeletableSystemPage("page")).toBe(true);
  });
});

describe("system page seeding", () => {
  it("seeds the home page plus every seed-enabled system page", () => {
    const rows = defaultSystemPages("org-1", "user-1");

    // Home first.
    expect(rows[0]!).toMatchObject({
      organizationId: "org-1",
      slug: "",
      title: "Strona główna",
      pageType: "page",
      isHome: true,
      status: "published",
    });
    expect(rows[0]!.createdByUserId).toBe("user-1");

    // Only the 404 system page is seeded alongside home.
    expect(rows.map((r) => r.pageType)).toEqual(["page", "system_404"]);
  });

  it("produces unique slugs per org", () => {
    const slugs = defaultSystemPages("org-1").map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives the 404 page a published status", () => {
    const rows = defaultSystemPages("org-1");
    const byType = Object.fromEntries(rows.map((r) => [r.pageType, r.status]));
    expect(byType["system_404"]).toBe("published");
    expect(byType["page"]).toBe("published");
  });

  it("builds valid ChaiBlock trees (root box, unique ids, typed children)", () => {
    for (const row of defaultSystemPages("org-1")) {
      expect(row.blocks.length).toBeGreaterThan(0);
      const root = row.blocks[0]!;
      expect(root._type).toBe("Box");
      expect(root._parent).toBeNull();
      for (const block of row.blocks) {
        expect(isChaiBlock(block as Record<string, unknown>)).toBe(true);
      }
      const ids = row.blocks.map((b) => b._id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("gives every organization fresh block ids (factory, not constant)", () => {
    const a = defaultSystemPages("org-a").map((r) => r.blocks.map((b) => b._id).join("|"));
    const b = defaultSystemPages("org-b").map((r) => r.blocks.map((b) => b._id).join("|"));
    expect(a).not.toEqual(b);
  });

  it("keeps the registry self-consistent with the definitions", () => {
    expect(SYSTEM_PAGE_DEFINITIONS.filter((d) => d.seed && d.slug !== null).map((d) => d.type)).toEqual([
      "system_404",
    ]);
  });
});