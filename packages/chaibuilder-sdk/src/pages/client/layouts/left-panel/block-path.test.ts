import { describe, expect, it } from "vitest";
import type { SectionTreeNode } from "./section-groups";
import { blockPathName, findPath } from "./block-path";

const hero: SectionTreeNode = { _id: "hero", _type: "Hero", _name: "Hero section" };
const column: SectionTreeNode = { _id: "col", _type: "Column" };
const button: SectionTreeNode = { _id: "btn", _type: "Button", _name: "Primary CTA" };
const footer: SectionTreeNode = { _id: "footer", _type: "Footer" };

const tree: SectionTreeNode[] = [
  hero,
  { ...column, children: [button] },
  footer,
];

describe("block-path", () => {
  it("returns the full path root → node for a nested block", () => {
    expect(findPath(tree, "btn").map((n) => n._id)).toEqual(["col", "btn"]);
  });

  it("returns a single-node path for a top-level section", () => {
    expect(findPath(tree, "hero").map((n) => n._id)).toEqual(["hero"]);
  });

  it("returns an empty array for a missing id", () => {
    expect(findPath(tree, "nope")).toEqual([]);
  });

  it("handles an empty tree", () => {
    expect(findPath([], "btn")).toEqual([]);
  });

  it("does not mutate or share node references across calls", () => {
    const first = findPath(tree, "btn");
    const second = findPath(tree, "btn");
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it("computes display names with _name precedence over _type", () => {
    expect(blockPathName({ _id: "btn", _type: "Button", _name: "Primary CTA" })).toBe("Primary CTA");
    expect(blockPathName({ _id: "col", _type: "Column" })).toBe("Column");
    expect(blockPathName({ _id: "x", _type: "blocks/Feature" })).toBe("Feature");
  });
});