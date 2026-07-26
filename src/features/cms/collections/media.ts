import type { CollectionConfig } from "payload";

type CmsReq = { organizationId?: string } & Record<string, unknown>;

export const mediaCollection: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "altText",
    group: "CMS",
  },
  upload: true,
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
      name: "altText",
      type: "text",
    },
    {
      name: "fileId",
      type: "text",
      required: true,
    },
  ],
};
