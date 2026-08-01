import { describe, expect, it } from "vitest";
import {
  filterSections,
  groupSections,
  isSectionOverridden,
  SECTION_GROUP_RULES,
  type SectionTreeNode,
} from "./section-groups";

const nav: SectionTreeNode = { _id: "1", _type: "Navbar", _name: "Top navigation" };
const hero: SectionTreeNode = { _id: "2", _type: "Hero", _name: "" };
const feature: SectionTreeNode = { _id: "3", _type: "Section", _name: "Featured courses" };
const footer: SectionTreeNode = { _id: "4", _type: "Footer", _name: "" };
const card: SectionTreeNode = { _id: "5", _type: "Box", _name: "Course card" };

describe("section-groups", () => {
  it("groups nodes into header/template/footer by heuristic", () => {
    const groups = groupSections([nav, hero, feature, footer, card]);

    expect(groups).toHaveLength(3);
    expect(groups[0].id).toBe("header");
    expect(groups[0].nodes.map((n) => n._id)).toEqual(["1"]);

    expect(groups[1].id).toBe("template");
    expect(groups[1].nodes.map((n) => n._id)).toEqual(["2", "3", "5"]);

    expect(groups[2].id).toBe("footer");
    expect(groups[2].nodes.map((n) => n._id)).toEqual(["4"]);
  });

  it("exposes label keys and rules", () => {
    const groups = groupSections([]);
    expect(groups.map((g) => g.labelKey)).toEqual(["Header", "Template", "Footer"]);
    expect(SECTION_GROUP_RULES.header).toContain("Navbar");
    expect(SECTION_GROUP_RULES.footer).toContain("Footer");
  });

  it("returns empty buckets for empty input", () => {
    const groups = groupSections([]);
    expect(groups.every((g) => g.nodes.length === 0)).toBe(true);
  });

  it("filters sections recursively by type or name", () => {
    const tree: SectionTreeNode[] = [
      { ...feature, children: [{ ...card, _name: "Hero mini" }] },
      { ...footer },
    ];

    const byName = filterSections(tree, "featured");
    expect(byName.map((n) => n._id)).toEqual(["3"]);

    const byChild = filterSections(tree, "hero mini");
    expect(byChild.map((n) => n._id)).toEqual(["3"]);
    expect(byChild[0].children?.map((c) => c._id)).toEqual(["5"]);

    const noMatch = filterSections(tree, "zzz");
    expect(noMatch).toEqual([]);
  });

  it("returns the same reference for empty query", () => {
    const tree: SectionTreeNode[] = [feature];
    expect(filterSections(tree, "  ")).toBe(tree);
  });

  it("detects overridden sections via background prop", () => {
    expect(isSectionOverridden({ ...feature, background: "#fff" })).toBe(true);
    expect(isSectionOverridden({ ...feature, props: { background: "#fff" } })).toBe(true);
    expect(isSectionOverridden(feature)).toBe(false);
  });

  it("detects overridden sections via className differing from default", () => {
    expect(isSectionOverridden({ ...feature, className: "p-8" }, { className: "" })).toBe(true);
    expect(isSectionOverridden({ ...feature, className: "p-8" }, { className: "p-8" })).toBe(false);
    expect(isSectionOverridden(feature)).toBe(false);
  });
});
