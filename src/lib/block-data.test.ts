import { describe, expect, it } from "vitest";

import { page } from "@/lib/db/schema/pages";
import { toBlogPostPreview } from "./block-data";

type PageRow = typeof page.$inferSelect;

function pageRow(overrides: Partial<PageRow> = {}): PageRow {
  return {
    id: "post-1",
    organizationId: "org-1",
    slug: "hello-world",
    title: "Row title",
    blocks: [],
    seo: null,
    status: "published",
    pageType: "blog_post",
    templateId: null,
    templateConfig: null,
    pageContent: null,
    parentId: null,
    isHome: false,
    createdByUserId: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-02T00:00:00Z"),
    publishedAt: new Date("2026-01-03T00:00:00Z"),
    publishedByUserId: null,
    ...overrides,
  };
}

describe("toBlogPostPreview", () => {
  it("maps pageContent fields into the preview shape", () => {
    const preview = toBlogPostPreview(
      pageRow({
        pageContent: {
          title: "Hello",
          body: "<p>Body</p>",
          excerpt: "Excerpt",
          image: "img.png",
          tags: ["tag1"],
          categories: ["news"],
        },
      }),
      "Jan Kowalski",
    );
    expect(preview.title).toBe("Hello");
    expect(preview.body).toBe("<p>Body</p>");
    expect(preview.excerpt).toBe("Excerpt");
    expect(preview.image).toBe("img.png");
    expect(preview.author).toBe("Jan Kowalski");
    expect(preview.tags).toEqual(["tag1"]);
    expect(preview.categories).toEqual(["news"]);
    expect(preview.slug).toBe("hello-world");
    expect(preview.datePublished).toBe("2026-01-03T00:00:00.000Z");
  });

  it("falls back to row title, seo fields and updatedAt", () => {
    const preview = toBlogPostPreview(
      pageRow({
        seo: { description: "seo desc", ogImage: "og.png" },
        publishedAt: null,
      }),
    );
    expect(preview.title).toBe("Row title");
    expect(preview.excerpt).toBe("seo desc");
    expect(preview.image).toBe("og.png");
    expect(preview.author).toBe("");
    expect(preview.datePublished).toBe("2026-01-02T00:00:00.000Z");
  });

  it("defaults empty content to empty strings and arrays", () => {
    const preview = toBlogPostPreview(pageRow());
    expect(preview.body).toBe("");
    expect(preview.tags).toEqual([]);
    expect(preview.categories).toEqual([]);
  });
});
