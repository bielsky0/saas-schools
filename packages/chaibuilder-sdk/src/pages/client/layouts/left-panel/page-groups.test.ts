import { describe, expect, it } from "vitest";
import { ChaiPage } from "~/pages/utils/page-organization";
import { ChaiPageType } from "~/types/actions";
import { groupPages, isSystemPageType, isTemplatePage } from "./page-groups";

const makePage = (overrides: Partial<ChaiPage>): ChaiPage => ({
  id: "p1",
  name: "Page",
  slug: "page",
  pageType: "page",
  parent: null,
  ...overrides,
});

describe("page-groups", () => {
  it("groups regular pages into the STRONY bucket", () => {
    const groups = groupPages([makePage({}), makePage({ id: "p2", name: "About", slug: "about" })], []);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.id).toBe("pages");
    expect(groups[0]!.pages).toHaveLength(2);
  });

  it("moves pageType==='template' pages into SZABLONY", () => {
    const groups = groupPages(
      [makePage({ id: "home", pageType: "page" }), makePage({ id: "tpl", pageType: "template", name: "Hero" })],
      [],
    );
    expect(groups.map((g) => g.id)).toEqual(["pages", "templates"]);
    expect(groups[1]!.pages.map((p) => p.id)).toEqual(["tpl"]);
  });

  it("puts pages whose pageType is flagged system into SYSTEMOWE", () => {
    const pageTypes = [
      { key: "page", name: "Page", hasSlug: true },
      { key: "registration_form", name: "Formularz zapisu", hasSlug: true, isSystem: true },
    ] as ChaiPageType[];
    const groups = groupPages(
      [makePage({ id: "reg", pageType: "registration_form", name: "Zapisy" }), makePage({ id: "home" })],
      pageTypes,
    );
    expect(groups.map((g) => g.id)).toEqual(["pages", "system"]);
    expect(groups[1]!.pages.map((p) => p.id)).toEqual(["reg"]);
  });

  it("hides the SYSTEMOWE group when no system pageTypes exist", () => {
    const groups = groupPages(
      [makePage({ id: "p", pageType: "whatever", name: "X" })],
      [{ key: "page", name: "Page", hasSlug: true }],
    );
    expect(groups.map((g) => g.id)).toEqual(["pages"]);
  });

  it("hides empty groups", () => {
    const groups = groupPages([], []);
    expect(groups).toHaveLength(0);
  });

  it("falls back to STRONY for unknown pageTypes", () => {
    const groups = groupPages([makePage({ id: "x", pageType: "custom", name: "X" })], []);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.id).toBe("pages");
  });

  it("isTemplatePage flags template pageType", () => {
    expect(isTemplatePage(makePage({ pageType: "template" }))).toBe(true);
    expect(isTemplatePage(makePage({}))).toBe(false);
  });

  it("isSystemPageType reads the isSystem flag", () => {
    expect(isSystemPageType({ key: "page", name: "Page", isSystem: true } as ChaiPageType)).toBe(true);
    expect(isSystemPageType({ key: "page", name: "Page" })).toBe(false);
  });
});
