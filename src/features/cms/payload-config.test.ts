import { describe, expect, it } from "vitest";

import { mediaCollection } from "./collections/media";
import { pagesCollection } from "./collections/pages";
import { themeCollection } from "./collections/theme";

const ALL_COLLECTIONS = [pagesCollection, mediaCollection, themeCollection] as const;

function fakeReq(organizationId?: string) {
  return { req: { organizationId } as Record<string, unknown> };
}

describe("each CMS collection has access.read constrained by organizationId", () => {
  for (const collection of ALL_COLLECTIONS) {
    describe(`${collection.slug}`, () => {
      it("has access.read defined", () => {
        expect(collection.access?.read).toBeDefined();
      });

      it("access.read returns organizationId constraint when req.organizationId is present", () => {
        const constraint = (collection.access!.read as unknown as (args: { req: Record<string, unknown> }) => unknown)({
          req: { organizationId: "org-a" },
        });
        expect(constraint).toEqual({ organizationId: { equals: "org-a" } });
      });

      it("access.read returns false when req.organizationId is absent", () => {
        const result = (collection.access!.read as unknown as (args: { req: Record<string, unknown> }) => unknown)({
          req: {},
        });
        expect(result).toBe(false);
      });

      it("access.read constrains organizationId regardless of depth parameter", () => {
        const constraint = (collection.access!.read as unknown as (args: { req: Record<string, unknown> }) => unknown)({
          req: { organizationId: "org-deep", depth: 2 },
        });
        expect(constraint).toEqual({ organizationId: { equals: "org-deep" } });
      });

      it("has access.update constrained by organizationId", () => {
        const constraint = (collection.access!.update as unknown as (args: { req: Record<string, unknown> }) => unknown)({
          req: { organizationId: "org-a" },
        });
        expect(constraint).toEqual({ organizationId: { equals: "org-a" } });
      });

      it("has access.create requiring organizationId", () => {
        const resultWithOrg = (collection.access!.create as unknown as (args: { req: Record<string, unknown> }) => unknown)({
          req: { organizationId: "org-a" },
        });
        expect(resultWithOrg).toBe(true);

        const resultWithoutOrg = (collection.access!.create as unknown as (args: { req: Record<string, unknown> }) => unknown)({
          req: {},
        });
        expect(resultWithoutOrg).toBe(false);
      });
    });
  }
});

describe("theme collection delete returns false (never deletable)", () => {
  it("access.delete returns false regardless of org context", () => {
    const readFn = themeCollection.access!.delete as unknown as (args: { req: Record<string, unknown> }) => unknown;
    const result = readFn(fakeReq("org-a"));
    expect(result).toBe(false);
  });
});

describe("pages and media collections have delete constrained by organizationId", () => {
  for (const collection of [pagesCollection, mediaCollection]) {
    describe(`${collection.slug}`, () => {
      it("access.delete returns organizationId constraint when req.organizationId is present", () => {
        const readFn = collection.access!.delete as unknown as (args: { req: Record<string, unknown> }) => unknown;
        const constraint = readFn({
          req: { organizationId: "org-a" },
        });
        expect(constraint).toEqual({ organizationId: { equals: "org-a" } });
      });

      it("access.delete returns false when req.organizationId is absent", () => {
        const readFn = collection.access!.delete as unknown as (args: { req: Record<string, unknown> }) => unknown;
        const result = readFn({ req: {} });
        expect(result).toBe(false);
      });
    });
  }
});
