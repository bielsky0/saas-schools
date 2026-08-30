import { nanoid } from "nanoid";

import type { ChaiBlock } from "@chaibuilder/sdk/types";

/**
 * System pages — registry-driven source of truth for platform-owned pages
 * that tenants get seeded on creation and edit in the ChaiBuilder editor
 * (mvp-plan F1). Currently only the org's 404 page (`system_404`); enrollment
 * listing/detail are NOT system pages — they follow the Shopify-style CMS
 * collection/template model (F2), mirroring the blog feature.
 *
 * Everything else in the system-pages feature derives from this one array:
 *
 *  - `defaultSystemPages` (org seeding in `createOrganizationAction`);
 *  - `buildPageTypes` in the editor API (`GET_PAGE_TYPES`) → `isSystem` flag,
 *    which drives the "System pages" group in the SDK left panel and the
 *    "Strony systemowe" section in the topbar page selector;
 *  - the `DELETE_PAGE` guard (non-deletable system pages);
 *  - `system_404` lookup in `[locale]/not-found.tsx`.
 *
 * To ADD a new system page type: add one entry here — seeding, editor lists,
 * guards and renderers pick it up automatically. To START seeding an existing
 * type: flip `seed: true` and set a `slug`.
 *
 * `buildDefaultBlocks` is a FACTORY, not a constant: every organization gets
 * blocks with freshly generated `_id`s so the editor's block store never sees
 * id collisions across tenants.
 */

export type SystemPageDefinition = {
  /** pageType value persisted on `page` rows, e.g. "system_404". */
  type: string;
  /** Display label in the editor (`GET_PAGE_TYPES` → `name`). */
  label: string;
  /** Seed slug. `null` → the type is registered but not seeded on creation. */
  slug: string | null;
  /** Whether a default page is created for new organizations. */
  seed: boolean;
  /** Whether `DELETE_PAGE` (archivization) is allowed for the org's page. */
  deletable: boolean;
  /** Seed status. */
  status: "published" | "draft";
  /** Seed `isHome`. */
  isHome?: boolean;
  /** Factory returning the default blocks (fresh ids per call). */
  buildDefaultBlocks: () => ChaiBlock[];
};

function genId(): string {
  return nanoid();
}

const STYLES_KEY = "#styles:";

type BlockSeed = Record<string, unknown>;

/** Root `Box` wrapper + children — mirrors `buildBlocks` in blocks-library. */
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

function box(parent: string, styles = ""): BlockSeed {
  return { _id: genId(), _type: "Box", _parent: parent, styles: `${STYLES_KEY},${styles}`, tag: "div" };
}

function heading(parent: string, content: string, tag = "h2", styles = "text-2xl font-bold"): BlockSeed {
  return { _id: genId(), _type: "Heading", _parent: parent, tag, content, styles: `${STYLES_KEY},${styles}` };
}

function paragraph(parent: string, content: string, styles = "text-muted-foreground"): BlockSeed {
  return { _id: genId(), _type: "Paragraph", _parent: parent, content, styles: `${STYLES_KEY},${styles}` };
}

function button(parent: string, content: string, href: string, styles = "text-primary-foreground bg-primary px-4 py-2 rounded-lg flex items-center self-center"): BlockSeed {
  return {
    _id: genId(),
    _type: "Button",
    _parent: parent,
    content,
    icon: "",
    iconSize: 16,
    iconPos: "order-last",
    link: { type: "url", href, target: "_self" },
    prefetchLink: true,
    styles: `${STYLES_KEY},${styles}`,
  };
}

function upcomingEvents(parent: string): BlockSeed {
  return {
    _id: genId(),
    _type: "UpcomingEvents",
    _parent: parent,
    limit: 5,
    showForLoggedIn: false,
    groupTypeId: "",
    styles: `${STYLES_KEY},`,
  };
}

function buildHomeBlocks(): ChaiBlock[] {
  return buildBlocks((parent) => [
    heading(parent, "Witaj w swojej akademii", "h1", "text-4xl font-bold"),
    paragraph(parent, "Edytuj tę stronę w edytorze ChaiBuilder, aby dopasować treść i styl do swojej akademii."),
    box(parent, "h-2"),
    upcomingEvents(parent),
  ]);
}

function buildNotFoundBlocks(): ChaiBlock[] {
  return buildBlocks((parent) => [
    heading(parent, "404", "h1", "text-6xl font-bold"),
    paragraph(parent, "Nie znaleźliśmy strony, której szukasz."),
    box(parent, "h-2"),
    button(parent, "Wróć na stronę główną", "/"),
  ]);
}

export const SYSTEM_PAGE_DEFINITIONS: SystemPageDefinition[] = [
  {
    type: "system_404",
    label: "404 — Nie znaleziono",
    slug: "404",
    seed: true,
    deletable: false,
    status: "published",
    buildDefaultBlocks: buildNotFoundBlocks,
  },
];

export const SYSTEM_PAGE_TYPE_KEYS: string[] = SYSTEM_PAGE_DEFINITIONS.map((d) => d.type);

export const SYSTEM_PAGE_TYPE_NAMES: Record<string, string> = Object.fromEntries(
  SYSTEM_PAGE_DEFINITIONS.map((d) => [d.type, d.label]),
);

/** Named references to the pageTypes, for call sites that need a specific one. */
export const SYSTEM_PAGE_TYPES = {
  notFound: "system_404",
} as const;

export function isSystemPageTypeKey(pageType: string): boolean {
  return SYSTEM_PAGE_TYPE_KEYS.includes(pageType);
}

export function isDeletableSystemPage(pageType: string): boolean {
  return SYSTEM_PAGE_DEFINITIONS.find((d) => d.type === pageType)?.deletable ?? true;
}

export type SystemPageSeedRow = {
  organizationId: string;
  slug: string;
  title: string;
  pageType: string;
  isHome: boolean;
  status: "published" | "draft";
  blocks: ChaiBlock[];
  createdByUserId?: string | null;
};

/** The org's landing page — a regular `page` (not a system type). */
export function defaultHomePage(organizationId: string, createdByUserId?: string | null): SystemPageSeedRow {
  return {
    organizationId,
    slug: "",
    title: "Strona główna",
    pageType: "page",
    isHome: true,
    status: "published",
    blocks: buildHomeBlocks(),
    createdByUserId,
  };
}

/** Rows to insert for a new organization: home + seeded system pages. */
export function defaultSystemPages(
  organizationId: string,
  createdByUserId?: string | null,
): SystemPageSeedRow[] {
  const systemPages = SYSTEM_PAGE_DEFINITIONS.filter((d) => d.seed && d.slug !== null).map((d) => ({
    organizationId,
    slug: d.slug as string,
    title: d.label,
    pageType: d.type,
    isHome: Boolean(d.isHome),
    status: d.status,
    blocks: d.buildDefaultBlocks(),
    createdByUserId,
  }));
  return [defaultHomePage(organizationId, createdByUserId), ...systemPages];
}