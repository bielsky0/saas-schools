import { describe, expect, it } from "vitest";

import type { CmsTemplate } from "@/lib/db/schema/cms-collections";

import {
  getDefaultTemplateConfig,
  getTemplateNameOf,
  getTemplateOf,
} from "./cms-collection-data";

describe("cms-collection-data (blog-templates-cms F2.5)", () => {
  const collection: { templates: CmsTemplate[] } = {
    templates: [
      { id: "tpl-blog-classic", name: "Klasyczny Artykuł", collectionId: "blog", layout: "single" },
      { id: "tpl-blog-interview", name: "Wywiad / Case Study", collectionId: "blog", layout: "sidebar" },
    ],
  };

  it("getTemplateOf finds a template by id within the collection", () => {
    expect(getTemplateOf(collection, "tpl-blog-classic")?.name).toBe("Klasyczny Artykuł");
    expect(getTemplateOf(collection, "missing")?.id).toBeUndefined();
    expect(getTemplateOf(collection, "tpl-blog-interview")?.layout).toBe("sidebar");
  });

  it("getTemplateOf returns null when no collection or template id", () => {
    expect(getTemplateOf(collection, undefined)).toBeNull();
    expect(getTemplateOf(null, "tpl-blog-classic")).toBeNull();
    expect(getTemplateOf(undefined, "tpl-blog-classic")).toBeNull();
  });

  it("getTemplateNameOf maps a template id to a human name or null", () => {
    expect(getTemplateNameOf(collection, "tpl-blog-classic")).toBe("Klasyczny Artykuł");
    expect(getTemplateNameOf(collection, null)).toBeNull();
    expect(getTemplateNameOf(collection, undefined)).toBeNull();
    expect(getTemplateNameOf(collection, "missing")).toBeNull();
  });

  it("getDefaultTemplateConfig derives defaults from the template layout", () => {
    const config = getDefaultTemplateConfig({ layout: "sidebar" });
    expect(config.layout).toBe("sidebar");
    expect(config.elements).toEqual({ thumbnail: true, related: true, newsletter: false });
    expect(config.dataMapping).toEqual([]);
    expect(config.seoDefaults).toEqual({
      titlePattern: "{title}",
      descriptionPattern: "{description}",
    });
  });
});
