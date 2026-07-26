import type { CollectionConfig } from "payload";

type CmsReq = { organizationId?: string } & Record<string, unknown>;

export const themeCollection: CollectionConfig = {
  slug: "theme",
  admin: {
    useAsTitle: "fontPrimary",
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
      return false;
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
      name: "fontPrimary",
      type: "text",
      required: true,
    },
    {
      name: "fontHeading",
      type: "text",
      required: true,
    },
    {
      name: "colorPrimary",
      type: "text",
      required: true,
    },
    {
      name: "colorSecondary",
      type: "text",
      required: true,
    },
  ],
};
