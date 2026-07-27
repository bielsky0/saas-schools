import type { Block } from "payload";

export const scheduleGridBlock = {
  slug: "schedule_grid",
  labels: { singular: "Schedule Grid", plural: "Schedule Grids" },
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
    },
    {
      name: "groupTypeIds",
      type: "json",
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
} as Block;

