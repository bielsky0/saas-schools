import type { Block } from "payload";

export const scheduleGridBlock: Block = {
  slug: "schedule_grid",
  labels: { singular: "Schedule Grid", plural: "Schedule Grids" },
  admin: { group: "Custom Blocks" },
  fields: [
    {
      name: "title",
      type: "text",
    },
    {
      name: "groupTypeIds",
      type: "select",
      hasMany: true,
      options: [],
      admin: {
        components: {
          Field: "/src/features/cms/components/group-type-picker.client#GroupTypePicker",
        },
      },
    },
    {
      name: "maxSessions",
      type: "number",
      defaultValue: 10,
      min: 1,
      max: 50,
    },
  ],
};

