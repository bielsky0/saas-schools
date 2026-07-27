import { describe, expect, it } from "vitest";

import { buildSitemapXml, buildRobotsTxt, type SitemapEntry } from "./sitemap";

describe("buildSitemapXml", () => {
  const entries: SitemapEntry[] = [
    { slug: "", updatedAt: "2026-07-26T10:00:00Z" },
    { slug: "about", updatedAt: "2026-07-25T12:00:00Z" },
    { slug: "classes", updatedAt: "2026-07-24T08:00:00Z" },
  ];

  it("returns valid XML", () => {
    const xml = buildSitemapXml(entries, "demo.langlion.pl");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("</urlset>");
  });

  it("includes all entries", () => {
    const xml = buildSitemapXml(entries, "demo.langlion.pl");
    expect(xml).toContain("https://demo.langlion.pl");
    expect(xml).toContain("https://demo.langlion.pl/about");
    expect(xml).toContain("https://demo.langlion.pl/classes");
  });

  it("uses correct host", () => {
    const xml = buildSitemapXml(entries, "custom.szkola.pl");
    expect(xml).toContain("https://custom.szkola.pl");
    expect(xml).not.toContain("langlion.pl");
  });

  it("sets priority 1.0 for home page (empty slug)", () => {
    const xml = buildSitemapXml(entries, "demo.langlion.pl");
    const homeUrl = "<loc>https://demo.langlion.pl</loc>";
    const homeIndex = xml.indexOf(homeUrl);
    const priorityAfter = xml.slice(homeIndex, homeIndex + 200);
    expect(priorityAfter).toContain("<priority>1.0</priority>");
  });

  it("sets priority 0.8 for subpages", () => {
    const xml = buildSitemapXml(entries, "demo.langlion.pl");
    const aboutUrl = "<loc>https://demo.langlion.pl/about</loc>";
    const aboutIndex = xml.indexOf(aboutUrl);
    const priorityAfter = xml.slice(aboutIndex, aboutIndex + 200);
    expect(priorityAfter).toContain("<priority>0.8</priority>");
  });

  it("includes lastmod for each entry", () => {
    const xml = buildSitemapXml(entries, "demo.langlion.pl");
    expect(xml).toContain("2026-07-26T10:00:00Z");
    expect(xml).toContain("2026-07-25T12:00:00Z");
  });

  it("handles empty entries gracefully", () => {
    const xml = buildSitemapXml([], "demo.langlion.pl");
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
    expect(xml).not.toContain("<url>");
  });
});

describe("buildRobotsTxt", () => {
  it("includes sitemap URL", () => {
    const robots = buildRobotsTxt("demo.langlion.pl");
    expect(robots).toContain("Sitemap: https://demo.langlion.pl/sitemap.xml");
  });

  it("disallows protected paths", () => {
    const robots = buildRobotsTxt("demo.langlion.pl");
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /api");
  });

  it("uses correct host", () => {
    const robots = buildRobotsTxt("custom.szkola.pl");
    expect(robots).toContain("https://custom.szkola.pl/sitemap.xml");
  });
});
