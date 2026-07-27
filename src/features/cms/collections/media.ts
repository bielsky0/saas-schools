import type { CollectionConfig } from "payload";

import { setTenantContext } from "../tenant-context";

type CmsReq = { user?: { organizationId?: string } } & Record<string, unknown>;

export const mediaCollection: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "altText",
    group: "CMS",
  },
  upload: true,
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
