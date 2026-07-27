import type { Block } from "payload";

export const pricingTableBlock: Block = {
  slug: "pricing_table",
  labels: { singular: "Pricing Table", plural: "Pricing Tables" },
  admin: { group: "Custom Blocks" },
  fields: [
    {
      name: "title",
      type: "text",
    },
    {
      name: "plans",
      type: "array",
      fields: [
        {
          name: "name",
          type: "text",
          required: true,
        },
        {
          name: "price",
          type: "text",
          required: true,
        },
        {
          name: "currency",
          type: "text",
          defaultValue: "PLN",
        },
        {
          name: "features",
          type: "array",
          fields: [
            {
              name: "item",
              type: "text",
            },
          ],
        },
        {
          name: "ctaLabel",
          type: "text",
        },
        {
          name: "ctaLink",
          type: "text",
        },
      ],
    },
  ],
};
