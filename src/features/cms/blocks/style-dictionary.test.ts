import { describe, expect, it } from "vitest";

import {
  BUTTON_SIZE_CLASSES,
  BUTTON_VARIANT_CLASSES,
  GAP_CLASSES,
  GRID_COLUMNS_CLASSES,
  buttonSizeClass,
  buttonVariantClass,
  gapClass,
  gridColumnsClass,
} from "./style-dictionary";

describe("GAP_CLASSES", () => {
  it("maps small/medium/large to Tailwind gap classes", () => {
    expect(GAP_CLASSES).toMatchObject({
      small: "gap-2",
      medium: "gap-4",
      large: "gap-8",
    });
  });
});

describe("BUTTON_SIZE_CLASSES", () => {
  it("maps small/medium/large to Tailwind padding+text classes", () => {
    expect(BUTTON_SIZE_CLASSES.small).toContain("text-sm");
    expect(BUTTON_SIZE_CLASSES.medium).toContain("text-base");
    expect(BUTTON_SIZE_CLASSES.large).toContain("text-lg");
  });
});

describe("BUTTON_VARIANT_CLASSES", () => {
  it("maps primary/secondary/outline to Tailwind color classes", () => {
    expect(BUTTON_VARIANT_CLASSES.primary).toContain("bg-primary");
    expect(BUTTON_VARIANT_CLASSES.secondary).toContain("bg-secondary");
    expect(BUTTON_VARIANT_CLASSES.outline).toContain("border-input");
  });
});

describe("GRID_COLUMNS_CLASSES", () => {
  it("maps 1/2/3/4 to responsive grid-cols classes", () => {
    expect(GRID_COLUMNS_CLASSES["1"]).toBe("grid-cols-1");
    expect(GRID_COLUMNS_CLASSES["2"]).toContain("sm:grid-cols-2");
    expect(GRID_COLUMNS_CLASSES["3"]).toContain("lg:grid-cols-3");
    expect(GRID_COLUMNS_CLASSES["4"]).toContain("lg:grid-cols-4");
  });
});

describe("helper functions", () => {
  it("gapClass returns known values", () => {
    expect(gapClass("small")).toBe("gap-2");
    expect(gapClass("medium")).toBe("gap-4");
    expect(gapClass("large")).toBe("gap-8");
  });

  it("gapClass returns fallback for unknown gap", () => {
    expect(gapClass("unknown")).toBe("gap-4");
  });

  it("buttonSizeClass returns known sizes", () => {
    expect(buttonSizeClass("small")).toContain("text-sm");
    expect(buttonSizeClass("medium")).toContain("text-base");
    expect(buttonSizeClass("large")).toContain("text-lg");
  });

  it("buttonSizeClass returns fallback for unknown size", () => {
    expect(buttonSizeClass("unknown")).toContain("text-base");
  });

  it("buttonVariantClass returns known variants", () => {
    expect(buttonVariantClass("primary")).toContain("bg-primary");
    expect(buttonVariantClass("secondary")).toContain("bg-secondary");
    expect(buttonVariantClass("outline")).toContain("border-input");
  });

  it("buttonVariantClass returns fallback for unknown variant", () => {
    expect(buttonVariantClass("unknown")).toContain("bg-primary");
  });

  it("gridColumnsClass returns known column counts", () => {
    expect(gridColumnsClass(1)).toBe("grid-cols-1");
    expect(gridColumnsClass(2)).toContain("sm:grid-cols-2");
    expect(gridColumnsClass(3)).toContain("lg:grid-cols-3");
    expect(gridColumnsClass(4)).toContain("lg:grid-cols-4");
  });

  it("gridColumnsClass defaults to 2-column for unknown count", () => {
    expect(gridColumnsClass(5)).toBe("grid-cols-1 sm:grid-cols-2");
  });
});
