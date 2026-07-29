import type { CollectionConfig } from "payload";

import { setTenantContext } from "../tenant-context";

type CmsReq = { user?: { organizationId?: string } } & Record<string, unknown>;

export const themeCollection: CollectionConfig = {
  slug: "theme",
  admin: {
    useAsTitle: "fontPrimary",
    group: "CMS",
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
      return false;
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
    {
      name: "borderRadius",
      type: "text",
      required: true,
    },
  ],
};
