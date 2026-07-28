import type { CollectionConfig } from "payload";
import { APIError } from "payload";
import { eq } from "drizzle-orm";

import { getAllBlockConfigs, isRegisteredBlock } from "../block-registry";
import { buildPreviewUrl } from "../preview-url";
import { validateBlockAccess } from "../validate-block-access";
import { CORE_BLOCK_TYPES } from "../block-registry";
import { setTenantContext } from "../tenant-context";
import { tenantBlockAccess } from "@/lib/db/schema/cms-tenant-block-access";

const ALL_BLOCKS = getAllBlockConfigs();

type CmsReq = { user?: { organizationId?: string } } & Record<string, unknown>;

export const pagesCollection: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    group: "CMS",
    preview: (doc, { req }) => {
      const host = req.headers.get("host") || "";
      const slug = (doc.slug as string) || "";
      return buildPreviewUrl(host, slug);
    },
    components: {
      edit: {
        // beforeDocumentControls: [
        //   "/src/features/cms/admin/components/page-switcher.client#PageSwitcher",
        // ],
      },
      views: {
        edit: {
          default: {
            Component:
              "/src/features/cms/admin/views/pages-edit-view.client#PagesEditView",
          },
        },
      },
    },
  },
  versions: {
    drafts: {
      autosave: {
        interval: 375,
      },
    },
  },
  access: {
    read: ({ req }) => {
      const orgId = (req as unknown as CmsReq).user?.organizationId;
      if (!orgId) return false;
      return { organizationId: { equals: orgId } };
    },
    create: ({ req }) => {
      const orgId = (req as unknown as CmsReq).user?.organizationId;
      if (!orgId) return false;
      return true;
    },
    update: ({ req }) => {
      const orgId = (req as unknown as CmsReq).user?.organizationId;
      if (!orgId) return false;
      return { organizationId: { equals: orgId } };
    },
    delete: ({ req }) => {
      const orgId = (req as unknown as CmsReq).user?.organizationId;
      if (!orgId) return false;
      return { organizationId: { equals: orgId } };
    },
  },
  hooks: {
    beforeOperation: [setTenantContext],
    beforeChange: [
      ({ data, req }) => {
        const orgId = (req as unknown as CmsReq).user?.organizationId;
        if (orgId) {
          return { ...data, organizationId: orgId };
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

        // Query tenant_block_access via drizzle ORM (not raw SQL — Payload's
        // drizzle wrapper doesn't reliably expose result.rows from execute())
        const payloadReq = req as unknown as { payload?: { db?: { drizzle: object } } };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const drizzleHandle = payloadReq.payload?.db?.drizzle as any;
        if (!drizzleHandle) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blockRows: any = await drizzleHandle
          .select({ blockKey: tenantBlockAccess.blockKey })
          .from(tenantBlockAccess)
          .where(eq(tenantBlockAccess.organizationId, orgId));

        const grantedKeys = new Set(
          (blockRows as { blockKey: string }[]).map((r) => r.blockKey),
        );

        const accessResult = validateBlockAccess(blocks, grantedKeys);
        if (!accessResult.valid) {
          throw new APIError(
            accessResult.errors.join("; "),
            400,
            null,
            true,
          );
        }
      },
    ],
  },
  fields: [
    {
      name: "organizationId",
      type: "text",
      admin: { hidden: true },
      access: { update: () => false, create: () => false },
    },
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
