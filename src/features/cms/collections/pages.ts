import type { CollectionConfig } from "payload";
import { sql } from "drizzle-orm";

import { getAllBlockConfigs, isRegisteredBlock } from "../block-registry";
import { validateBlockAccess } from "../validate-block-access";
import { CORE_BLOCK_TYPES } from "../block-registry";

const ALL_BLOCKS = getAllBlockConfigs();

type CmsReq = { organizationId?: string } & Record<string, unknown>;

export const pagesCollection: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    group: "CMS",
  },
  access: {
    read: ({ req }) => {
      const cmsReq = req as unknown as CmsReq;
      if (!cmsReq.organizationId) return false;
      return { organizationId: { equals: cmsReq.organizationId } };
    },
    create: ({ req }) => {
      const cmsReq = req as unknown as CmsReq;
      if (!cmsReq.organizationId) return false;
      return true;
    },
    update: ({ req }) => {
      const cmsReq = req as unknown as CmsReq;
      if (!cmsReq.organizationId) return false;
      return { organizationId: { equals: cmsReq.organizationId } };
    },
    delete: ({ req }) => {
      const cmsReq = req as unknown as CmsReq;
      if (!cmsReq.organizationId) return false;
      return { organizationId: { equals: cmsReq.organizationId } };
    },
  },
  hooks: {
    beforeChange: [
      ({ data, req }) => {
        const cmsReq = req as unknown as CmsReq;
        if (cmsReq.organizationId) {
          return { ...data, organizationId: cmsReq.organizationId };
        }
        return data;
      },
      async ({ data, req, operation }) => {
        if (operation !== "create" && operation !== "update") return;

        const blocks = (data as Record<string, unknown>)?.blocks;
        if (!blocks || !Array.isArray(blocks)) return;

        // Only validate if there are custom blocks in the data
        const hasCustomBlocks = blocks.some((b: unknown) => {
          const bt = (b as Record<string, unknown>)?.blockType;
          return typeof bt === "string" && isRegisteredBlock(bt) && !CORE_BLOCK_TYPES.has(bt);
        });

        if (!hasCustomBlocks) return;

        // Always scoped to req.organizationId set by auth strategy / beforeChange
        const orgId = (data as Record<string, unknown>)?.organizationId as string | undefined;
        if (!orgId) return;

        // Query tenant_block_access via drizzle
        const payloadReq = req as unknown as { payload?: { db?: { drizzle: object } } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const drizzleHandle = payloadReq.payload?.db?.drizzle as any;
        if (!drizzleHandle) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any = await drizzleHandle.execute(
          sql`SELECT block_key FROM tenant_block_access WHERE organization_id = ${orgId}`,
        );

        const grantedKeys = new Set(
          (rows as unknown as { blockKey: string }[]).map((r) => r.blockKey),
        );

        const result = validateBlockAccess(blocks, grantedKeys);
        if (!result.valid) {
          throw new Error(result.errors.join("; "));
        }
      },
    ],
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: false,
      index: true,
    },
    {
      name: "status",
      type: "select",
      options: [
        { label: "Draft", value: "draft" },
        { label: "Published", value: "published" },
      ],
      defaultValue: "draft",
    },
    {
      name: "blocks",
      type: "blocks",
      blocks: ALL_BLOCKS,
    },
    {
      name: "seoDescription",
      type: "textarea",
      maxLength: 160,
      admin: {
        description: "Meta description for search engines (max 160 characters)",
      },
    },
  ],
};
