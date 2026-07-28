/**
 * C1 integration + findByID transaction behavior (spike Faza 30, closing items).
 */

import { createRequire } from "module";
const _cpr = createRequire(import.meta.url);
import { buildConfig, getPayload } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { Pool } from "pg";

const PG_URL = "postgresql://saas_school:saas_school@localhost:5433/saas_boilerplate";
const PG_MIGRATION_URL = "postgresql://postgres:postgres@localhost:5433/saas_boilerplate";

type HookCapture = { beforeOp?: { transactionID: string; operation: string } };
const captured = new Map<string, HookCapture>();
let hookKey = "";

async function withPgPool<T>(url: string, max: number, fn: (client: any) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: url, max });
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
    await pool.end();
  }
}

async function cleanup() {
  await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
    for (const tbl of ["pages","payload_kv","users_sessions","users","payload_locked_documents_rels","payload_locked_documents","payload_preferences_rels","payload_preferences","payload_migrations"]) {
      await client.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE`);
    }
    await client.query("DROP TYPE IF EXISTS enum_pages_status CASCADE");
  });
}

async function createTables() {
  await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
    await client.query("DROP TYPE IF EXISTS enum_pages_status CASCADE");
    await client.query(`CREATE TYPE enum_pages_status AS ENUM ('draft', 'published')`);
    await client.query(`CREATE TABLE IF NOT EXISTS "pages" (id SERIAL PRIMARY KEY, title VARCHAR NOT NULL, slug VARCHAR NOT NULL, "organization_id" TEXT DEFAULT '', status enum_pages_status DEFAULT 'draft', blocks JSONB, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "payload_kv" (id SERIAL PRIMARY KEY, key VARCHAR NOT NULL, data JSONB NOT NULL)`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS payload_kv_key_idx ON "payload_kv"(key)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "users" (id SERIAL PRIMARY KEY, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL, email VARCHAR NOT NULL, reset_password_token VARCHAR, reset_password_expiration TIMESTAMPTZ, salt VARCHAR, hash VARCHAR, login_attempts NUMERIC DEFAULT 0, lock_until TIMESTAMPTZ)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "users_sessions" (_order INTEGER NOT NULL, _parent_id INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE, id VARCHAR PRIMARY KEY, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ NOT NULL)`);
    for (const tbl of ["payload_locked_documents_rels","payload_locked_documents","payload_preferences_rels","payload_preferences","payload_migrations"]) {
      await client.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE`);
    }
    await client.query(`CREATE TABLE IF NOT EXISTS "payload_locked_documents" (id SERIAL PRIMARY KEY, global_slug VARCHAR, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (id SERIAL PRIMARY KEY, "order" INTEGER, parent_id INTEGER NOT NULL REFERENCES "payload_locked_documents"(id) ON DELETE CASCADE, path VARCHAR NOT NULL, pages_id INTEGER REFERENCES "pages"(id) ON DELETE CASCADE, users_id INTEGER REFERENCES "users"(id) ON DELETE CASCADE)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "payload_preferences" (id SERIAL PRIMARY KEY, key VARCHAR, value JSONB, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (id SERIAL PRIMARY KEY, "order" INTEGER, parent_id INTEGER NOT NULL REFERENCES "payload_preferences"(id) ON DELETE CASCADE, path VARCHAR NOT NULL, users_id INTEGER REFERENCES "users"(id) ON DELETE CASCADE)`);
    await client.query(`CREATE TABLE IF NOT EXISTS "payload_migrations" (id SERIAL PRIMARY KEY, name VARCHAR, batch NUMERIC, updated_at TIMESTAMPTZ DEFAULT now() NOT NULL, created_at TIMESTAMPTZ DEFAULT now() NOT NULL)`);
    console.log("  [setup] Tables created");
  });
}

async function applyRLS() {
  await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
    for (const tbl of ["pages"]) {
      await client.query(`ALTER TABLE "${tbl}" ENABLE ROW LEVEL SECURITY`);
      await client.query(`ALTER TABLE "${tbl}" FORCE ROW LEVEL SECURITY`);
      await client.query(`DROP POLICY IF EXISTS "${tbl}_tenant_isolation" ON "${tbl}"`);
      await client.query(`DROP POLICY IF EXISTS "${tbl}_tenant_isolation_insert" ON "${tbl}"`);
      await client.query(`DROP POLICY IF EXISTS "${tbl}_tenant_isolation_update" ON "${tbl}"`);
      await client.query(`DROP POLICY IF EXISTS "${tbl}_tenant_isolation_delete" ON "${tbl}"`);
      await client.query(`DROP POLICY IF EXISTS "${tbl}_system_bypass" ON "${tbl}"`);
      await client.query(`CREATE POLICY "${tbl}_tenant_isolation" ON "${tbl}" FOR SELECT TO saas_school USING (true)`);
      await client.query(`CREATE POLICY "${tbl}_tenant_isolation_insert" ON "${tbl}" FOR INSERT TO saas_school WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''))`);
      await client.query(`CREATE POLICY "${tbl}_tenant_isolation_update" ON "${tbl}" FOR UPDATE TO saas_school USING ("organization_id" = nullif(current_setting('app.organization_id', true), '')) WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''))`);
      await client.query(`CREATE POLICY "${tbl}_tenant_isolation_delete" ON "${tbl}" FOR DELETE TO saas_school USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))`);
      await client.query(`CREATE POLICY "${tbl}_system_bypass" ON "${tbl}" FOR ALL TO saas_school USING (coalesce(current_setting('app.bypass_rls', true), '') = 'on') WITH CHECK (coalesce(current_setting('app.bypass_rls', true), '') = 'on')`);
    }
    console.log("  [setup] RLS applied (split policies: SELECT permissive, write with GUC)");
  });
}

async function main() {
  console.log("\n=== SPIKE 30 — C1 + findByID ===\n");
  await cleanup();
  await createTables();

  const config = buildConfig({
    secret: "spike-30-c1-secret-not-for-production",
    admin: { disable: true },
    db: postgresAdapter({
      pool: { connectionString: PG_URL, max: 3 },
      blocksAsJSON: true, push: false, disableCreateDatabase: true,
    }),
    collections: [{
      slug: "pages",
      admin: { useAsTitle: "title" },
      access: {
        read: ({ req }) => { const orgId = (req as any).organizationId; return orgId ? { organizationId: { equals: orgId } } : false; },
        create: ({ req }) => { const orgId = (req as any).organizationId; return orgId ? true : false; },
        update: ({ req }) => { const orgId = (req as any).organizationId; return orgId ? { organizationId: { equals: orgId } } : false; },
        delete: ({ req }) => { const orgId = (req as any).organizationId; return orgId ? { organizationId: { equals: orgId } } : false; },
      },
      fields: [
        { name: "title", type: "text", required: true },
        { name: "slug", type: "text", required: true },
        { name: "status", type: "select", options: [{ label: "Draft", value: "draft" }, { label: "Published", value: "published" }], defaultValue: "draft" },
        { name: "organizationId", type: "text", required: true, admin: { hidden: true } },
        { name: "blocks", type: "blocks", blocks: [{ slug: "text", fields: [{ name: "content", type: "text", required: true }] }, { slug: "button", fields: [{ name: "label", type: "text", required: true }, { name: "url", type: "text", required: true }] }] },
      ],
      hooks: {
        beforeOperation: [
          ({ req, operation }) => {
            const key = hookKey || "default";
            const entry = captured.get(key) || {};
            const txid = req.transactionID;
            let txStr: string;
            if (txid instanceof Promise) txStr = "PROMISE";
            else if (typeof txid === "number" || typeof txid === "string") txStr = "PRESENT";
            else txStr = "ABSENT";
            entry.beforeOp = { transactionID: txStr, operation };
            captured.set(key, entry);
          },
        ],
        beforeChange: [
          ({ data, req }) => {
            const orgId = (req as any).organizationId;
            return orgId ? { ...data, organizationId: orgId } : data;
          },
        ],
      },
    }],
  });

  console.log("  [setup] Initializing Payload...");
  const payload = await getPayload({ config });
  console.log("  [setup] Payload initialized\n");

  // -- Seed --
  console.log("-- Seed: two organizations --");
  const pageA1 = await payload.create({ collection: "pages", data: { title: "Org A Page 1", slug: "org-a-page-1", organizationId: "org-a" }, overrideAccess: true });
  const pageA2 = await payload.create({ collection: "pages", data: { title: "Org A Page 2", slug: "org-a-page-2", organizationId: "org-a" }, overrideAccess: true });
  const pageB = await payload.create({ collection: "pages", data: { title: "Org B Page", slug: "org-b-page", organizationId: "org-b" }, overrideAccess: true });
  console.log(`  Created 3 pages: pageA1.id=${pageA1.id}, pageA2.id=${pageA2.id}, pageB.id=${pageB.id}`);

  await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
    const rows = await client.query(`SELECT id, slug, organization_id FROM "pages" ORDER BY slug`);
    for (const r of rows.rows) console.log(`    id=${r.id} slug=${r.slug} org_id=${r.organization_id}`);
  });

  // -- A0c-ext: findByID transactionID (before RLS, so create() control works) --
  console.log("\n-- Test A0c-ext: findByID transactionID --");
  hookKey = "findByID";
  try {
    await payload.findByID({ collection: "pages", id: pageA1.id, overrideAccess: true });
    const txid = captured.get("findByID")?.beforeOp?.transactionID;
    console.log(`  findByID()  -- transactionID = ${txid}`);
    hookKey = "find";
    await payload.find({ collection: "pages", limit: 1, overrideAccess: true });
    const txidFind = captured.get("find")?.beforeOp?.transactionID;
    console.log(`  find()      -- transactionID = ${txidFind}`);
    hookKey = "create";
    await payload.create({ collection: "pages", data: { title: "Tx Test", slug: "tx-test", organizationId: "org-a" }, overrideAccess: true });
    const txidCreate = captured.get("create")?.beforeOp?.transactionID;
    console.log(`  create()    -- transactionID = ${txidCreate}`);
    if (txid === "ABSENT" && txidFind === "ABSENT") {
      console.log("  ✅ findByID matches find -- both ABSENT. Architecture confirmed.");
    } else if (txid === "PRESENT") {
      console.log(`  ⚠️  findByID is PRESENT (unlike find=${txidFind}). Admin Panel edit path has RLS for free.`);
    } else {
      console.log(`  ℹ️  findByID=${txid}, find=${txidFind}, create=${txidCreate}`);
    }
  } catch (e: any) {
    console.log(`  ❌ findByID test ERROR: ${e.message}`);
  }

  // -- Apply RLS after transactionID tests (split policies: SELECT permissive, write with GUC) --
  console.log("\n-- Applying RLS (migration 0060 fix: permissive SELECT, GUC write) --");
  await applyRLS();

  // -- Verify RLS doesn't block reads (SELECT is permissive) --
  console.log("\n-- Verify RLS: SELECT permissive (no GUC needed) --");
  await withPgPool(PG_URL, 1, async (client) => {
    const rows = await client.query(`SELECT id, title, organization_id FROM "pages" ORDER BY id`);
    console.log(`  RLS SELECT: ${rows.rowCount} rows returned (expected 4)`);
    for (const r of rows.rows) console.log(`    id=${r.id} title=${r.title} org_id=${r.organization_id}`);
  });

  // -- Verify RLS blocks INSERT without GUC --
  console.log("\n-- Verify RLS: INSERT without GUC should be rejected --");
  await withPgPool(PG_URL, 1, async (client) => {
    try {
      await client.query(`INSERT INTO "pages" (title, slug, organization_id) VALUES ('rogue', 'rogue', 'org-a')`);
      console.log("  WARN: INSERT without GUC succeeded (RLS not blocking writes)");
    } catch (e: any) {
      console.log(`  ✅ RLS INSERT block: ${e.message}`);
    }
  });

  // -- C1: access.read filter through PayloadRequest -> payload.find() (with RLS active) --
  console.log("\n-- Test C1: access.read filter through real PayloadRequest (with RLS active) --");

  const createPayloadRequest = _cpr(
    "/Users/bielsky/Documents/saas-school/node_modules/.pnpm/payload@3.86.0_graphql@16.14.2_typescript@5.9.3/node_modules/payload/dist/utilities/createPayloadRequest.js"
  ).createPayloadRequest;

  async function findAsOrg(orgId: string): Promise<string[]> {
    const request = new Request("http://localhost:3000/api/pages", { method: "GET" });
    const req = await createPayloadRequest({ config, request });
    (req as Record<string, unknown>).organizationId = orgId;
    const result = await payload.find({ collection: "pages", req, overrideAccess: false, depth: 0 });
    return (result.docs as any[])?.map((d: any) => d.title) ?? [];
  }

  const titlesA = await findAsOrg("org-a");
  console.log(`  org-a -> ${titlesA.length} pages: [${titlesA.join(", ")}]`);
  const titlesB = await findAsOrg("org-b");
  console.log(`  org-b -> ${titlesB.length} pages: [${titlesB.join(", ")}]`);

  const c1Pass =
    titlesA.includes("Org A Page 1") && titlesA.includes("Org A Page 2") && titlesA.includes("Tx Test") && !titlesA.includes("Org B Page") && titlesA.length === 3;
  const c1PassB =
    titlesB.includes("Org B Page") && !titlesB.includes("Org A Page 1") && !titlesB.includes("Org A Page 2") && titlesB.length === 1;

  if (c1Pass && c1PassB) {
    console.log("  ✅ C1 PASS — access.read filters correctly through PayloadRequest + find() (with RLS active)");
  } else {
    console.log(`  ❌ C1 FAIL — org-a saw [${titlesA}], org-b saw [${titlesB}]`);
  }

  // -- Cleanup --
  console.log("\n  [cleanup] Destroying Payload & removing tables...");
  await Promise.race([
    payload.db.destroy?.(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("destroy timeout")), 5000)),
  ]).catch(() => console.log("  [cleanup] destroy may have timed out, continuing"));
  await cleanup();
  console.log("\n=== C1 + findByID COMPLETE ===\n");
}

main().catch((e) => { console.error("FAIL:", e.message); console.error(e.stack); process.exit(1); });
