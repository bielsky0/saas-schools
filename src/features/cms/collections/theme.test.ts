import { describe, expect, it } from "vitest";

import { themeCollection } from "./theme";

describe("theme collection config", () => {
  it("has slug 'theme'", () => {
    expect(themeCollection.slug).toBe("theme");
  });

  it("has admin group set to CMS", () => {
    expect(themeCollection.admin?.group).toBe("CMS");
  });

  it("has access.read defined", () => {
    expect(themeCollection.access?.read).toBeDefined();
  });

  it("has access.delete returning false (never deletable)", () => {
    const deleteFn = themeCollection.access?.delete;
    expect(deleteFn).toBeDefined();
    const result = (deleteFn as unknown as (args: { req: Record<string, unknown> }) => unknown)({
      req: { organizationId: "org-a" },
    });
    expect(result).toBe(false);
  });

  it("has required fontPrimary field", () => {
    const field = themeCollection.fields?.find(
      (f) => (f as { name?: string }).name === "fontPrimary",
    ) as { type?: string; required?: boolean } | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("text");
    expect(field?.required).toBe(true);
  });

  it("has required fontHeading field", () => {
    const field = themeCollection.fields?.find(
      (f) => (f as { name?: string }).name === "fontHeading",
    ) as { type?: string; required?: boolean } | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("text");
    expect(field?.required).toBe(true);
  });

  it("has required colorPrimary field", () => {
    const field = themeCollection.fields?.find(
      (f) => (f as { name?: string }).name === "colorPrimary",
    ) as { type?: string; required?: boolean } | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("text");
    expect(field?.required).toBe(true);
  });

  it("has required colorSecondary field", () => {
    const field = themeCollection.fields?.find(
      (f) => (f as { name?: string }).name === "colorSecondary",
    ) as { type?: string; required?: boolean } | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("text");
    expect(field?.required).toBe(true);
  });
});
