import { describe, expect, it } from "vitest";
import { registerSectionCatalogEntry } from "./section-catalog";
import { groupSections, type SectionTreeNode } from "./section-groups";

const nav: SectionTreeNode = { _id: "1", _type: "CustomNav", _name: "" };
const cta: SectionTreeNode = { _id: "2", _type: "CallToAction", _name: "" };
const foot: SectionTreeNode = { _id: "3", _type: "CustomFooter", _name: "" };

describe("groupSections with catalog roles", () => {
  it("uses catalog role over the heuristic and overrides by type", () => {
    registerSectionCatalogEntry({ type: "CustomNav", labelKey: "Nav", category: "cards", role: "header" });
    registerSectionCatalogEntry({ type: "CustomFooter", labelKey: "Footer", category: "footers", role: "footer" });

    const groups = groupSections([nav, cta, foot]);
    const byId = Object.fromEntries(groups.map((g) => [g.id, g.nodes.map((n) => n._id)]));

    expect(byId.header).toEqual(["1"]);
    expect(byId.footer).toEqual(["3"]);
    expect(byId.template).toEqual(["2"]);
  });

  it("keeps the heuristic as fallback for unknown types", () => {
    const groups = groupSections([{ _id: "9", _type: "SomethingUnknown", _name: "Footer-ish thing" }]);
    const footer = groups.find((g) => g.id === "footer");
    expect(footer?.nodes.map((n) => n._id)).toEqual(["9"]);
  });
});
