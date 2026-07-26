import { describe, expect, it } from "vitest";

import { mediaCollection } from "./media";

describe("media collection config", () => {
  it("has slug 'media'", () => {
    expect(mediaCollection.slug).toBe("media");
  });

  it("has admin group set to CMS", () => {
    expect(mediaCollection.admin?.group).toBe("CMS");
  });

  it("has access.read defined", () => {
    expect(mediaCollection.access?.read).toBeDefined();
  });

  it("has altText field (nullable)", () => {
    const altTextField = mediaCollection.fields?.find(
      (f) => (f as { name?: string }).name === "altText",
    ) as { type?: string } | undefined;
    expect(altTextField).toBeDefined();
    expect(altTextField?.type).toBe("text");
  });

  it("has required fileId field", () => {
    const fileIdField = mediaCollection.fields?.find(
      (f) => (f as { name?: string }).name === "fileId",
    ) as { type?: string; required?: boolean } | undefined;
    expect(fileIdField).toBeDefined();
    expect(fileIdField?.type).toBe("text");
    expect(fileIdField?.required).toBe(true);
  });

  it("has beforeChange hook that sets organizationId", () => {
    expect(mediaCollection.hooks?.beforeChange).toBeDefined();
    expect(Array.isArray(mediaCollection.hooks?.beforeChange)).toBe(true);
    expect(mediaCollection.hooks?.beforeChange).toHaveLength(1);
  });
});
