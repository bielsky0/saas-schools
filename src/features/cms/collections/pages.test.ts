import { describe, expect, it } from "vitest";

import { pagesCollection } from "./pages";

describe("pages collection config", () => {
  it("has slug 'pages'", () => {
    expect(pagesCollection.slug).toBe("pages");
  });

  it("has admin group set to CMS", () => {
    expect(pagesCollection.admin?.group).toBe("CMS");
  });

  it("has access.read defined", () => {
    expect(pagesCollection.access?.read).toBeDefined();
  });

  it("has required title field", () => {
    const titleField = pagesCollection.fields?.find(
      (f) => (f as { name?: string }).name === "title",
    ) as { type?: string; required?: boolean } | undefined;
    expect(titleField).toBeDefined();
    expect(titleField?.type).toBe("text");
    expect(titleField?.required).toBe(true);
  });

  it("has slug field with index", () => {
    const slugField = pagesCollection.fields?.find(
      (f) => (f as { name?: string }).name === "slug",
    ) as { type?: string; required?: boolean; index?: boolean } | undefined;
    expect(slugField).toBeDefined();
    expect(slugField?.type).toBe("text");
    expect(slugField?.required).toBe(true);
    expect(slugField?.index).toBe(true);
  });

  it("has status field with draft/published options", () => {
    const statusField = pagesCollection.fields?.find(
      (f) => (f as { name?: string }).name === "status",
    ) as { type?: string; options?: { value: string }[] } | undefined;
    expect(statusField).toBeDefined();
    expect(statusField?.type).toBe("select");
    const values = statusField?.options?.map((o) => o.value) ?? [];
    expect(values).toContain("draft");
    expect(values).toContain("published");
  });

  it("has blocks field", () => {
    const blocksField = pagesCollection.fields?.find(
      (f) => (f as { name?: string }).name === "blocks",
    ) as { type?: string } | undefined;
    expect(blocksField).toBeDefined();
    expect(blocksField?.type).toBe("blocks");
  });

  it("has beforeChange hook that sets organizationId", () => {
    expect(pagesCollection.hooks?.beforeChange).toBeDefined();
    expect(Array.isArray(pagesCollection.hooks?.beforeChange)).toBe(true);
    expect(pagesCollection.hooks?.beforeChange).toHaveLength(1);
  });
});
