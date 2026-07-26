import type { CollectionConfig } from "payload";

import { getAllBlockConfigs } from "../block-registry";

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
  ],
};
