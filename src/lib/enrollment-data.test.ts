import { describe, expect, it } from "vitest";

import {
  buildDefaultEnrollmentListingBlocks,
  buildDefaultEnrollmentTemplateBlocks,
} from "./enrollment-blocks";

describe("enrollment blocks (mvp-plan F2)", () => {
  it("default template blocks contain the full enrollment section set", () => {
    const blocks = buildDefaultEnrollmentTemplateBlocks();
    const types = blocks.map((b) => b._type);
    expect(types).toContain("EnrollmentHero");
    expect(types).toContain("EnrollmentSchedule");
    expect(types).toContain("EnrollmentPricing");
    expect(types).toContain("EnrollmentInstructors");
    expect(types).toContain("EnrollmentPolicy");
    expect(types).toContain("EnrollmentBookingFlow");
  });

  it("default template blocks get fresh _ids per call (no id collisions across orgs)", () => {
    const a = buildDefaultEnrollmentTemplateBlocks();
    const b = buildDefaultEnrollmentTemplateBlocks();
    const idsA = new Set(a.map((blk) => blk._id));
    const idsB = new Set(b.map((blk) => blk._id));
    expect(idsA.size).toBe(a.length);
    expect(idsB.size).toBe(b.length);
    expect([...idsA].some((id) => idsB.has(id))).toBe(false);
  });

  it("booking flow block anchors to the booking section id", () => {
    const blocks = buildDefaultEnrollmentTemplateBlocks();
    const flow = blocks.find((b) => b._type === "EnrollmentBookingFlow");
    expect(flow?.anchorId).toBe("booking");
  });

  it("default listing blocks contain the enrollment list", () => {
    const blocks = buildDefaultEnrollmentListingBlocks();
    const types = blocks.map((b) => b._type);
    expect(types).toContain("EnrollmentList");
    expect(types).toContain("Heading");
  });
});