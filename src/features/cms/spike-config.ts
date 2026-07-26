import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";

export const spikeConfig = buildConfig({
  secret: "spike-30-local-dev-secret-not-for-production",
  admin: {
    disable: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: "postgresql://saas_school:saas_school@localhost:5433/saas_boilerplate",
      max: 3,
    },
    blocksAsJSON: true,
    afterSchemaInit: [
      async () => {
        const { Pool } = await import("pg");
        const pool = new Pool({
          connectionString: "postgresql://postgres:postgres@localhost:5433/saas_boilerplate",
          max: 1,
        });
        try {
          await pool.query(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "organization_id" TEXT;`);
          await pool.query(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;`);
          await pool.query(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;`);
        } finally {
          await pool.end();
        }
      },
    ],
  } as any),
  collections: [
    {
      slug: "pages",
      admin: {
        useAsTitle: "title",
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
          blocks: [
            {
              slug: "text",
              fields: [
                {
                  name: "content",
                  type: "textarea",
                  required: true,
                },
              ],
            },
            {
              slug: "button",
              fields: [
                {
                  name: "label",
                  type: "text",
                  required: true,
                },
                {
                  name: "url",
                  type: "text",
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as any);
