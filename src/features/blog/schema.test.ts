import { describe, expect, it } from "vitest";

import { createBlogPostSchema } from "./schema";

const t = ((key: string) => key) as any;

describe("createBlogPostSchema", () => {
  const schema = createBlogPostSchema(t);

  it("accepts a minimal valid post", () => {
    const parsed = schema.safeParse({ title: "Hello world" });
    expect(parsed.success).toBe(true);
  });

  it("accepts a full post with content, tags and seo", () => {
    const parsed = schema.safeParse({
      title: "Nowy wpis",
      slug: "nowy-wpis",
      body: "<p>Treść</p>",
      excerpt: "Zajawka",
      image: "https://example.com/img.png",
      tags: ["tag1", "tag2"],
      categories: ["aktualnosci"],
      seo: { title: "SEO", description: "desc", ogImage: "https://example.com/og.png", noIndex: true },
      status: "published",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toEqual(["tag1", "tag2"]);
      expect(parsed.data.status).toBe("published");
      expect(parsed.data.seo?.noIndex).toBe(true);
    }
  });

  it("rejects a too-short title", () => {
    const parsed = schema.safeParse({ title: "A" });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid slug format", () => {
    const parsed = schema.safeParse({ title: "X", slug: "UPPER case!" });
    expect(parsed.success).toBe(false);
  });

  it("normalizes slug to lowercase", () => {
    const parsed = schema.safeParse({ title: "Wpis", slug: "Moja-Strona" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.slug).toBe("moja-strona");
  });

  it("rejects a slug with spaces", () => {
    const parsed = schema.safeParse({ title: "Wpis", slug: "  moja strona  " });
    expect(parsed.success).toBe(false);
  });

  it("accepts empty optional fields", () => {
    const parsed = schema.safeParse({ title: "Wpis", slug: "", body: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slug).toBe("");
      expect(parsed.data.body).toBe("");
    }
  });

  it("rejects an invalid status value", () => {
    const parsed = schema.safeParse({ title: "X", status: "deleted" });
    expect(parsed.success).toBe(false);
  });

  it("rejects more than 10 tags", () => {
    const parsed = schema.safeParse({
      title: "X",
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(parsed.success).toBe(false);
  });
});
