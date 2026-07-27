import type { Block } from "payload";

export const heroSectionBlock = {
  slug: "hero_section",
  labels: { singular: "Hero Section", plural: "Hero Sections" },
  admin: {
    group: "Sekcje",
    components: {
      Label: "/src/features/cms/admin/block-row-label#RowLabel",
    },
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "subtitle",
      type: "text",
    },
    {
      name: "ctaLabel",
      type: "text",
    },
    {
      name: "ctaLink",
      type: "text",
    },
    {
      name: "backgroundImage",
      type: "relationship",
      relationTo: "media",
    },
    {
      name: "layout",
      type: "select",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
      defaultValue: "center",
    },
  ],
} as Block;
