import { postgresAdapter } from "@payloadcms/db-postgres";
import { buildConfig } from "payload";
import { Pool } from "pg";

import { env } from "@/lib/env/server";

import { pagesCollection } from "./collections/pages";
import { mediaCollection } from "./collections/media";
import { themeCollection } from "./collections/theme";
import { betterAuthPayloadStrategy } from "./payload-auth-strategy";

async function run(sql: string) {
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  try {
    await pool.query(sql);
  } finally {
    await pool.end();
  }
}

export default buildConfig({
  secret: env.BETTER_AUTH_SECRET,
  admin: {
    user: "users",
    meta: {
      titleSuffix: " — Langlion CMS",
    },
  },
  graphQL: { disable: true } as any, // Not tested in spike — see docs/spike-30/raport.md §4
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
      max: 3,
    },
    blocksAsJSON: true,
    afterSchemaInit: [
      (async () => {
        await run(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "organization_id" TEXT NOT NULL DEFAULT '';`);
        await run(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;`);
        await run(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "updated_by_user_id" TEXT;`);
        await run(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;`);
        await run(`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "organization_id" TEXT NOT NULL DEFAULT '';`);
        await run(`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;`);
        await run(`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;`);
        await run(`ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "organization_id" TEXT NOT NULL DEFAULT '';`);
        await run(`ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "created_by_user_id" TEXT;`);
        await run(`ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "updated_by_user_id" TEXT;`);
      }) as any,
    ],
    beforeSchemaInit: [
      (async () => {
        await run(`CREATE TABLE IF NOT EXISTS "tenant_block_access" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "organization_id" TEXT NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
          "block_key" TEXT NOT NULL,
          "granted_by_user_id" TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
          "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE("organization_id", "block_key")
        );`);
      }) as any,
    ],
  }),
  collections: [pagesCollection, mediaCollection, themeCollection],
  auth: {
    strategies: [betterAuthPayloadStrategy],
  },
} as any);
