import { postgresAdapter } from "@payloadcms/db-postgres";
import { cloudStoragePlugin } from "@payloadcms/plugin-cloud-storage";
import { pl } from "@payloadcms/translations/languages/pl";
import { buildConfig } from "payload";
import { Pool } from "pg";

import { env } from "@/lib/env/server";

import { pagesCollection } from "./collections/pages";
import { mediaCollection } from "./collections/media";
import { themeCollection } from "./collections/theme";
import { usersCollection } from "./collections/users";
import { cmsStorageAdapter } from "./payload-storage-adapter";

declare global {
  var __PAYLOAD_SCHEMA_INIT_DONE__: boolean | undefined;
}

const SCHEMA_INIT_LOCK_KEY = 19841984;

function diag(msg: string) {
  process.stderr.write(`[DIAG:payload-config] ${new Date().toISOString()} [pid:${process.pid}] ${msg}\n`);
}

function getOwnerUrl(): string {
  const url = process.env.DATABASE_MIGRATION_URL;
  if (!url) {
    throw new Error(
      "DATABASE_MIGRATION_URL is required for CMS schema init. " +
        "See docs/plan/00-rozstrzygniecia-i-audyt.md §D2.",
    );
  }
  return url;
}

async function acquireSchemaInitLock(): Promise<Pool | null> {
  const pool = new Pool({ connectionString: getOwnerUrl(), max: 1 });
  try {
    const { rows } = await pool.query(
      "SELECT pg_try_advisory_lock($1) AS acquired",
      [SCHEMA_INIT_LOCK_KEY],
    );
    if (!rows[0]?.acquired) {
      await pool.end();
      return null;
    }
    return pool;
  } catch {
    await pool.end();
    return null;
  }
}

async function releaseSchemaInitLock(pool: Pool): Promise<void> {
  try {
    await pool.query("SELECT pg_advisory_unlock($1)", [SCHEMA_INIT_LOCK_KEY]);
  } finally {
    await pool.end();
  }
}

diag("MODULE EVAL");
export default buildConfig({
  secret: env.BETTER_AUTH_SECRET,
  admin: {
    user: "users",
    meta: {
      titleSuffix: " — Langlion CMS",
    },
    components: {
      graphics: {
        Logo: "/src/features/cms/admin/components/logo#AdminLogo",
        Icon: "/src/features/cms/admin/components/icon#AdminIcon",
      },
    },
    css: "/src/features/cms/admin/styles/admin-overrides.scss",
  },
  routes: {
    api: "/api/payload",
  },
  i18n: {
    fallbackLanguage: "pl",
    supportedLanguages: {
      pl: { translations: pl.translations },
    },
  },
  graphQL: { disable: true } as any, // Not tested in spike — see docs/spike-30/raport.md §4
  db: postgresAdapter({
    pool: {
      // Dziś tables już istnieją, więc env.DATABASE_URL (unprivileged) działa
      // dla DML, ale Payload auto-migracja nie utworzy nowych tabel na świeżej
      // bazie. Migracje idą przez jawne .sql — patrz: regresja run() w
      // beforeSchemaInit.
      connectionString: env.DATABASE_URL,
      max: 3,
    },
    push: false,
    blocksAsJSON: true,
    beforeSchemaInit: [
      (async ({ schema }: any) => {
        if (globalThis.__PAYLOAD_SCHEMA_INIT_DONE__) {
          diag("beforeSchemaInit SKIP — already done");
          return schema;
        }
        const lock = await acquireSchemaInitLock();
        if (!lock) {
          diag("beforeSchemaInit SKIP — lock held by another process");
          return schema;
        }
        const t0 = Date.now();
        diag("beforeSchemaInit START");
        try {
          await lock.query(`CREATE TABLE IF NOT EXISTS "tenant_block_access" (
            "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            "organization_id" TEXT NOT NULL REFERENCES "organization"(id) ON DELETE CASCADE,
            "block_key" TEXT NOT NULL,
            "granted_by_user_id" TEXT NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
            "granted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE("organization_id", "block_key")
          );`);
          diag(`beforeSchemaInit END (${Date.now() - t0}ms)`);
        } finally {
          await releaseSchemaInitLock(lock);
        }
        return schema;
      }) as any,
    ],
    afterSchemaInit: [
      (async ({ schema }: any) => {
        if (globalThis.__PAYLOAD_SCHEMA_INIT_DONE__) {
          diag("afterSchemaInit SKIP — already done");
          return schema;
        }
        const lock = await acquireSchemaInitLock();
        if (!lock) {
          diag("afterSchemaInit SKIP — lock held by another process");
          return schema;
        }
        const t0 = Date.now();
        diag("afterSchemaInit START");
        try {
          const run = (sql: string) => lock.query(sql).catch(() => {});
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
          // payload_admin_users is non-tenant (no organization_id column). RLS on a
          // table without an isolation column provides zero security benefit — the
          // only policy was _system_bypass, which required app.bypass_rls = 'on' to
          // be set on every operation. The auth strategy's upsert (via payload.db)
          // doesn't set that flag, so every login was blocked by RLS. Disable RLS
          // on this table entirely — see docs/specyfikacja-cms.md §4 decision #3.
          await run(`DROP POLICY IF EXISTS payload_admin_users_system_bypass ON payload_admin_users`);
          await run(`ALTER TABLE payload_admin_users NO FORCE ROW LEVEL SECURITY`);
          await run(`ALTER TABLE payload_admin_users DISABLE ROW LEVEL SECURITY`);
          globalThis.__PAYLOAD_SCHEMA_INIT_DONE__ = true;
          diag(`afterSchemaInit END (${Date.now() - t0}ms)`);
        } finally {
          await releaseSchemaInitLock(lock);
        }
        return schema;
      }) as any,
    ],
  }),
  collections: [pagesCollection, mediaCollection, themeCollection, usersCollection],
  plugins: [
    cloudStoragePlugin({
      collections: {
        media: {
          adapter: cmsStorageAdapter,
        },
      },
    }),
  ],
} as any);
