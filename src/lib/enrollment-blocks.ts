import { nanoid } from "nanoid";
import type { ChaiBlock } from "@chaibuilder/sdk/types";

/**
 * Default enrollment layout blocks (mvp-plan F2) — PURE factories, no DB/env
 * imports, so they stay unit-testable under Vitest. `enrollment-data.ts`
 * re-exports these and uses them as the "one default template" every org
 * starts with until the owner customizes the template in the builder.
 */

/** `cms_collection.key` of the enrollments collection. */
export const ENROLLMENT_COLLECTION_KEY = "enrollments";
/** `CmsTemplate.id` of the org's default enrollment template. */
export const ENROLLMENT_TEMPLATE_KEY = "tpl-enrollment-default";

function genId(): string {
  return nanoid();
}

const STYLES_KEY = "#styles:";

type BlockSeed = Record<string, unknown>;

function buildBlocks(build: (parentId: string) => BlockSeed[]): ChaiBlock[] {
  const rootId = genId();
  const root: BlockSeed = {
    _id: rootId,
    _type: "Box",
    _parent: null,
    styles: `${STYLES_KEY},flex flex-col gap-6 p-6`,
    tag: "div",
  };
  return [root, ...build(rootId)] as ChaiBlock[];
}

function heading(parent: string, content: string, tag = "h2", styles = "text-2xl font-bold"): BlockSeed {
  return { _id: genId(), _type: "Heading", _parent: parent, tag, content, styles: `${STYLES_KEY},${styles}` };
}

/**
 * Default enrollment landing layout: Hero + schedule + pricing + trainers +
 * policy + the inline booking widget. The booking widget renders with
 * `id="booking"` so CTA anchors can scroll to it.
 */
export function buildDefaultEnrollmentTemplateBlocks(): ChaiBlock[] {
  return buildBlocks((parent) => [
    {
      _id: genId(),
      _type: "EnrollmentHero",
      _parent: parent,
      showPrice: true,
      showDescription: true,
      ctaLabel: "Przejdź do zapisu",
      ctaHref: "#booking",
      styles: `${STYLES_KEY},`,
    },
    {
      _id: genId(),
      _type: "EnrollmentSchedule",
      _parent: parent,
      limit: 5,
      showTrainer: true,
      showLocation: true,
      styles: `${STYLES_KEY},`,
    },
    {
      _id: genId(),
      _type: "EnrollmentPricing",
      _parent: parent,
      showSinglePrice: true,
      showPackages: true,
      styles: `${STYLES_KEY},`,
    },
    {
      _id: genId(),
      _type: "EnrollmentInstructors",
      _parent: parent,
      limit: 4,
      styles: `${STYLES_KEY},`,
    },
    {
      _id: genId(),
      _type: "EnrollmentPolicy",
      _parent: parent,
      showConsents: true,
      styles: `${STYLES_KEY},`,
    },
    {
      _id: genId(),
      _type: "EnrollmentBookingFlow",
      _parent: parent,
      anchorId: "booking",
      styles: `${STYLES_KEY},`,
    },
  ]);
}

/** Default `/zapisy` listing layout (pageType `enrollment_listing`). */
export function buildDefaultEnrollmentListingBlocks(): ChaiBlock[] {
  return buildBlocks((parent) => [
    heading(parent, "Nasze zajęcia", "h1", "text-3xl font-bold"),
    {
      _id: genId(),
      _type: "EnrollmentList",
      _parent: parent,
      columns: "3",
      showPrice: true,
      styles: `${STYLES_KEY},`,
    },
  ]);
}