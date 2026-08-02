import { describe, expect, it } from "vitest";

import {
  CMS_COLLECTIONS,
  getCollectionById,
  getCollectionByPageType,
  getDefaultTemplateConfig,
  getTemplateById,
  getTemplateName,
} from "./cms-collections";

describe("CMS_COLLECTIONS config", () => {
  it("is non-empty and defines both the blog and courses collections", () => {
    expect(CMS_COLLECTIONS.length).toBeGreaterThan(0);
    expect(CMS_COLLECTIONS.map((c) => c.id).sort()).toEqual(["blog", "courses"]);
  });

  it("has unique collection ids and unique pageTypes", () => {
    const ids = CMS_COLLECTIONS.map((c) => c.id);
    const pageTypes = CMS_COLLECTIONS.flatMap((c) => [c.pageType, c.templatePageType]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(pageTypes).size).toBe(pageTypes.length);
  });

  it("every template belongs to its owning collection", () => {
    for (const collection of CMS_COLLECTIONS) {
      for (const template of collection.templates) {
        expect(template.collectionId).toBe(collection.id);
        expect(template.layout).toMatch(/^(single|sidebar)$/);
      }
    }
  });

  it("template ids are globally unique across collections", () => {
    const ids = CMS_COLLECTIONS.flatMap((c) => c.templates.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each collection has at least one template", () => {
    for (const collection of CMS_COLLECTIONS) {
      expect(collection.templates.length).toBeGreaterThan(0);
    }
  });
});

describe("getCollectionById / getCollectionByPageType", () => {
  it("resolves a collection by id", () => {
    expect(getCollectionById("blog")?.name).toBe("Wpis na blogu");
    expect(getCollectionById("nope")).toBeUndefined();
    expect(getCollectionById(undefined)).toBeUndefined();
  });

  it("resolves a collection by pageType and templatePageType", () => {
    expect(getCollectionByPageType("blog_post")?.id).toBe("blog");
    expect(getCollectionByPageType("blog_post_template")?.id).toBe("blog");
    expect(getCollectionByPageType("course_entry")?.id).toBe("courses");
    expect(getCollectionByPageType("page")).toBeUndefined();
  });
});

describe("getTemplateById / getTemplateName", () => {
  it("resolves a template inside its collection", () => {
    const tpl = getTemplateById("blog", "tpl-blog-classic");
    expect(tpl?.name).toBe("Klasyczny Artykuł");
    expect(tpl?.layout).toBe("single");
  });

  it("does not leak templates across collections", () => {
    expect(getTemplateById("blog", "tpl-course-default")).toBeUndefined();
    expect(getTemplateById("courses", "tpl-blog-classic")).toBeUndefined();
  });

  it("maps a templateId to a human name and null when absent", () => {
    expect(getTemplateName("blog", "tpl-blog-interview")).toBe("Wywiad / Case Study");
    expect(getTemplateName("blog", null)).toBeNull();
    expect(getTemplateName("blog", "tpl-unknown")).toBeNull();
    expect(getTemplateName("nope", "tpl-blog-classic")).toBeNull();
  });
});

describe("getDefaultTemplateConfig", () => {
  it("carries the template layout and sane fallbacks", () => {
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
