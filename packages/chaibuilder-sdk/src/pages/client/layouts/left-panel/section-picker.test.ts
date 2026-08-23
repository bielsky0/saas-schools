import { describe, expect, it } from "vitest";
import type { ChaiBlock } from "~/types/common";
import { getSectionInsertPosition } from "./section-picker";

describe("getSectionInsertPosition", () => {
  const sectionA: ChaiBlock = { _id: "a", _type: "Hero", _parent: null };
  const sectionB: ChaiBlock = { _id: "b", _type: "Footer", _parent: null };
  const inner: ChaiBlock = { _id: "c", _type: "Heading", _parent: "a" };
  const leaf: ChaiBlock = { _id: "d", _type: "Button", _parent: "c" };
  const allBlocks = [sectionA, sectionB, inner, leaf];

  it("returns -1 when nothing is selected", () => {
    expect(getSectionInsertPosition(undefined, allBlocks)).toBe(-1);
  });

  it("inserts directly after the top-level section of a selected top-level block", () => {
    expect(getSectionInsertPosition(sectionA, allBlocks)).toBe(1);
  });

  it("inserts after the top-level ancestor of a deeply nested block", () => {
    expect(getSectionInsertPosition(leaf, allBlocks)).toBe(1);
  });

  it("returns -1 when the selected block is not found in the tree", () => {
    const orphan: ChaiBlock = { _id: "zz", _type: "Box", _parent: null };
    expect(getSectionInsertPosition(orphan, allBlocks)).toBe(-1);
  });

  it("returns the list length when selecting the last section", () => {
    expect(getSectionInsertPosition(sectionB, allBlocks)).toBe(2);
  });
});