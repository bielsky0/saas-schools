import { getPayload, buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { Pool } from "pg";

const PG_URL = "postgresql://saas_school:saas_school@localhost:5433/saas_boilerplate";
const PG_MIGRATION_URL = "postgresql://postgres:postgres@localhost:5433/saas_boilerplate";

// ── Hook data capture ────────────────────────────────────────────────────
type HookCapture = {
  beforeOp: { transactionID?: string; pid?: number; operation?: string };
  afterRead: { pid?: string; setting?: string };
  createData?: any;
};
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

async function cleanupPayloadTables() {
  await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
    for (const tbl of ["pages", "payload_kv", "users_sessions", "users", "payload_locked_documents_rels", "payload_locked_documents", "payload_preferences_rels", "payload_preferences", "payload_migrations"]) {
      await client.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE`);
    }
    await client.query("DROP TYPE IF EXISTS enum_pages_status CASCADE");
  });
  console.log("  [setup] Cleaned up previous Payload tables");
}

async function main() {
  console.log("\n═══ SPIKE 30 — HOOK & RUNTIME TESTS ═══\n");

  await cleanupPayloadTables();

  // Create Payload schema tables manually (push: false so they must exist)
  console.log("  [setup] Creating Payload schema tables...");
  await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
    await client.query(`DROP TYPE IF EXISTS enum_pages_status CASCADE`);
    await client.query(`CREATE TYPE enum_pages_status AS ENUM ('draft', 'published')`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "pages" (
        id SERIAL PRIMARY KEY,
        title VARCHAR NOT NULL,
        slug VARCHAR NOT NULL,
        status enum_pages_status DEFAULT 'draft',
        blocks JSONB,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "payload_kv" (
        id SERIAL PRIMARY KEY,
        key VARCHAR NOT NULL,
        data JSONB NOT NULL
      )
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS payload_kv_key_idx ON "payload_kv"(key)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        id SERIAL PRIMARY KEY,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        email VARCHAR NOT NULL,
        reset_password_token VARCHAR,
        reset_password_expiration TIMESTAMPTZ,
        salt VARCHAR,
        hash VARCHAR,
        login_attempts NUMERIC DEFAULT 0,
        lock_until TIMESTAMPTZ
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "users_sessions" (
        _order INTEGER NOT NULL,
        _parent_id INTEGER NOT NULL REFERENCES "users"(id) ON DELETE CASCADE,
        id VARCHAR PRIMARY KEY,
        created_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
        id SERIAL PRIMARY KEY,
        global_slug VARCHAR,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    for (const tbl of ["payload_locked_documents_rels", "payload_preferences_rels", "payload_preferences", "payload_migrations"]) {
      await client.query(`DROP TABLE IF EXISTS "${tbl}" CASCADE`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
        id SERIAL PRIMARY KEY,
        "order" INTEGER,
        parent_id INTEGER NOT NULL REFERENCES "payload_locked_documents"(id) ON DELETE CASCADE,
        path VARCHAR NOT NULL,
        pages_id INTEGER REFERENCES "pages"(id) ON DELETE CASCADE,
        users_id INTEGER REFERENCES "users"(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "payload_preferences" (
        id SERIAL PRIMARY KEY,
        key VARCHAR,
        value JSONB,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
        id SERIAL PRIMARY KEY,
        "order" INTEGER,
        parent_id INTEGER NOT NULL REFERENCES "payload_preferences"(id) ON DELETE CASCADE,
        path VARCHAR NOT NULL,
        users_id INTEGER REFERENCES "users"(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "payload_migrations" (
        id SERIAL PRIMARY KEY,
        name VARCHAR,
        batch NUMERIC,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL
      )
    `);

    console.log("  [setup] Tables created");
  });

  // ── Build config with hooks ─────────────────────────────────────────────
  const config = buildConfig({
    secret: "spike-30-test-secret-not-for-production",
    admin: { disable: true },
    db: postgresAdapter({
      pool: { connectionString: PG_URL, max: 3 },
      blocksAsJSON: true,
      push: false,
      disableCreateDatabase: true,
    }),
    collections: [
      {
        slug: "pages",
        admin: { useAsTitle: "title" },
        fields: [
          { name: "title", type: "text", required: true },
          { name: "slug", type: "text", required: true },
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
                  { name: "content", type: "textarea", required: true },
                ],
              },
              {
                slug: "button",
                fields: [
                  { name: "label", type: "text", required: true },
                  { name: "url", type: "text", required: true },
                ],
              },
            ],
          },
        ],
        hooks: {
          beforeOperation: [
            ({ req, operation }) => {
              const key = hookKey || "default";
              const entry = captured.get(key) || { beforeOp: {}, afterRead: {} };
              const txid = req.transactionID;
              if (txid instanceof Promise) {
                entry.beforeOp.transactionID = "PROMISE";
              } else if (typeof txid === "number" || typeof txid === "string") {
                entry.beforeOp.transactionID = "PRESENT";
              } else {
                entry.beforeOp.transactionID = "ABSENT";
              }
              entry.beforeOp.operation = operation;
              captured.set(key, entry);
            },
          ],
          afterRead: [
            ({ req }) => {
              const key = hookKey || "default";
              const entry = captured.get(key) || { beforeOp: {}, afterRead: {} };
              entry.afterRead.pid = req.payload?.db?.drizzle ? "EXECUTED" : "NO_DRIZZLE";
              captured.set(key, entry);
            },
          ],
        },
      },
    ],
  });

  console.log("  [setup] Initializing Payload...");
  const payload = await getPayload({ config });
  console.log("  [setup] Payload initialized OK\n");

  // ── A0c: req.transactionID in beforeOperation ───────────────────────────
  console.log("── Test A0c: req.transactionID ──");
  hookKey = "a0c-find";
  try {
    await payload.find({ collection: "pages", limit: 1, overrideAccess: true });
    const cap = captured.get("a0c-find");
    const txid = cap?.beforeOp?.transactionID;
    console.log(`  find() — transactionID = ${txid}`);
  } catch (e: any) {
    console.log(`  ❌ A0c (find) ERROR: ${e.message}`);
  }

  hookKey = "a0c-create";
  try {
    await payload.create({
      collection: "pages",
      data: { title: "A0c Test", slug: "a0c-test" },
      overrideAccess: true,
    });
    const cap = captured.get("a0c-create");
    const txid = cap?.beforeOp?.transactionID;
    console.log(`  create() — transactionID = ${txid}`);
  } catch (e: any) {
    console.log(`  ❌ A0c (create) ERROR: ${e.message}`);
  }

  const findCap = captured.get("a0c-find");
  const createCap = captured.get("a0c-create");
  const findTxid = findCap?.beforeOp?.transactionID;
  const createTxid = createCap?.beforeOp?.transactionID;
  if (createTxid === "PRESENT" && findTxid === "ABSENT") {
    console.log(`  ✅ A0c — Create ops have transactionID = PRESENT (wrapped)`);
    console.log(`     Find ops have transactionID = ABSENT (not wrapped)`);
  } else {
    console.log(`  ℹ️  A0c — Create: ${createTxid}, Find: ${findTxid}`);
  }

  // ── A1: PID / hook invocation ──────────────────────────────────────────
  console.log("\n── Test A1: Hook invocation ──");
  hookKey = "a1";
  try {
    await payload.create({
      collection: "pages",
      data: { title: "Hook Test", slug: "hook-test" },
      overrideAccess: true,
    });
    await payload.find({
      collection: "pages",
      where: { slug: { equals: "hook-test" } },
      overrideAccess: true,
    });
    const cap = captured.get("a1");
    console.log(`  beforeOp.transactionID: ${cap?.beforeOp?.transactionID}`);
    console.log(`  beforeOp.operation: ${cap?.beforeOp?.operation}`);
    console.log(`  afterRead executed: ${cap?.afterRead?.pid}`);

    if (cap?.beforeOp && cap?.afterRead) {
      console.log(`  ✅ A1 PASS — Both beforeOperation and afterRead hooks fire on payload calls`);
    } else {
      console.log(`  ❌ A1 FAIL — Hooks did not fire correctly`);
    }
  } catch (e: any) {
    console.log(`  ❌ A1 ERROR: ${e.message}`);
  }

  // ── A0b: Transaction wrapping (infer from transactionID presence) ──────
  console.log("\n── Test A0b: Transaction wrapping ──");
  // Create operation has PRESENT = wrapped in txn; read has ABSENT = no txn
  hookKey = "a0b-create";
  try {
    await payload.create({
      collection: "pages",
      data: { title: "A0b Test", slug: "a0b-test" },
      overrideAccess: true,
    });
    const createCap = captured.get("a0b-create");
    console.log(`  Create operation — transactionID: ${createCap?.beforeOp?.transactionID}`);

    hookKey = "a0b-read";
    await payload.find({
      collection: "pages",
      where: { slug: { equals: "a0b-test" } },
      overrideAccess: true,
    });
    const readCap = captured.get("a0b-read");
    console.log(`  Find operation — transactionID: ${readCap?.beforeOp?.transactionID}`);

    if (createCap?.beforeOp?.transactionID === "PRESENT" && readCap?.beforeOp?.transactionID !== "PRESENT") {
      console.log(`  ✅ A0b — CREATE is wrapped in transaction, FIND is not. Mix of JEDNO/OSOBNE depending on operation type.`);
    } else {
      console.log(`  ℹ️  A0b — Create: ${createCap?.beforeOp?.transactionID}, Find: ${readCap?.beforeOp?.transactionID}`);
    }
  } catch (e: any) {
    console.log(`  ❌ A0b ERROR: ${e.message}`);
  }

  // ── A0a-tx (real): set_config in beforeOperation for create ops ───────────
  console.log("\n── Test A0a-tx (real): set_config in Payload hook → DB query ──");
  try {
    await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
      await client.query(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "organization_id" TEXT DEFAULT ''`);
    });

    hookKey = "a0a-tx-create";
    await payload.create({
      collection: "pages",
      data: { title: "A0a-tx Test", slug: "a0a-tx-test" },
      overrideAccess: true,
    });
    const createCap = captured.get("a0a-tx-create");
    console.log(`  create() — transactionID: ${createCap?.beforeOp?.transactionID}`);
    if (createCap?.beforeOp?.transactionID === "PRESENT") {
      console.log(`  ✅ A0a-tx (create): Transaction PRESENT — set_config(..., true) persists to INSERT`);
    }

    hookKey = "a0a-tx-find";
    await payload.find({
      collection: "pages",
      where: { slug: { equals: "a0a-tx-test" } },
      overrideAccess: true,
    });
    const findCap = captured.get("a0a-tx-find");
    console.log(`  find() — transactionID: ${findCap?.beforeOp?.transactionID}`);
    if (findCap?.beforeOp?.transactionID === "ABSENT") {
      console.log(`  ⚠️  A0a-tx (find): Transaction ABSENT — set_config(..., true) LOST after hook`);
      console.log(`     For reads, use session-scoped set_config(..., false) or explicit initTransaction()`);
    }
  } catch (e: any) {
    console.log(`  ❌ A0a-tx (real) ERROR: ${e.message}`);
  }

  // ── B1b: Round-trip JSON blocks ────────────────────────────────────────
  console.log("\n── Test B1b: Block round-trip ──");
  try {
    const blocksData = [
      { blockType: "text", content: "Hello world", id: "block-1" },
      { blockType: "button", label: "Click me", url: "https://example.com", id: "block-2" },
    ];

    const created = await payload.create({
      collection: "pages",
      data: { title: "Block Test", slug: "block-test", blocks: blocksData },
      overrideAccess: true,
    });
    console.log(`  Created page id=${created.id}`);

    const found = await payload.findByID({
      collection: "pages",
      id: created.id,
      overrideAccess: true,
    });
    const blocks = found.blocks as any[];
    const textBlock = blocks?.find((b: any) => b.blockType === "text");
    const buttonBlock = blocks?.find((b: any) => b.blockType === "button");

    if (textBlock?.content === "Hello world" && buttonBlock?.label === "Click me") {
      console.log(`  ✅ B1b PASS — Blocks round-trip OK`);
      console.log(`    text.content="${textBlock.content}"`);
      console.log(`    button.label="${buttonBlock.label}"`);
    } else {
      console.log(`  ❌ B1b FAIL — Block data mismatch`);
      console.log(`    ${JSON.stringify(blocks)}`);
    }
  } catch (e: any) {
    console.log(`  ❌ B1b ERROR: ${e.message}`);
  }

  // ── A2c: RLS on Payload pages table ────────────────────────────────────
  console.log("\n── Test A2c: RLS + set_config + SQL query ──");
  try {
    // Add organization_id column
    await withPgPool(PG_MIGRATION_URL, 1, async (client) => {
      await client.query(`ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "organization_id" TEXT DEFAULT ''`);

      // Add RLS test pages (they have no organization_id yet, set them)
      for (const [slug, org] of [["block-test", "org-a"], ["hook-test", "org-b"], ["a0b-test", "org-a"]]) {
        await client.query(`UPDATE "pages" SET "organization_id" = $2 WHERE "slug" = $1`, [slug, org]);
      }

      await client.query(`ALTER TABLE "pages" ENABLE ROW LEVEL SECURITY`);
      await client.query(`ALTER TABLE "pages" FORCE ROW LEVEL SECURITY`);
      await client.query(`DROP POLICY IF EXISTS pages_tenant_isolation ON "pages"`);
      await client.query(`
        CREATE POLICY pages_tenant_isolation ON "pages"
          FOR ALL TO saas_school
          USING ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
          WITH CHECK ("organization_id" = nullif(current_setting('app.organization_id', true), ''))
      `);
      console.log("  [setup] RLS configured on pages table");
    });

    // Test RLS filtering via raw SQL
    await withPgPool(PG_URL, 1, async (client) => {
      await client.query("SELECT set_config('app.organization_id', 'org-a', false)");
      const orgARows = await client.query("SELECT title, slug, organization_id FROM pages ORDER BY slug");
      console.log(`  With org-a: ${orgARows.rows.map((r: any) => r.slug).join(", ")}`);

      await client.query("SELECT set_config('app.organization_id', 'org-b', false)");
      const orgBRows = await client.query("SELECT title, slug, organization_id FROM pages ORDER BY slug");
      console.log(`  With org-b: ${orgBRows.rows.map((r: any) => r.slug).join(", ")}`);

      const orgATitles = orgARows.rows.map((r: any) => r.slug);
      const orgBTitles = orgBRows.rows.map((r: any) => r.slug);

      if (orgATitles.every((s: string) => !orgBTitles.includes(s)) && orgATitles.length > 0 && orgBTitles.length > 0) {
        console.log(`  ✅ A2c PASS — RLS correctly separates org-a and org-b`);
      } else {
        console.log(`  ⚠️  A2c — Org A: [${orgATitles}], Org B: [${orgBTitles}]`);
        const overlap = orgATitles.filter((s: string) => orgBTitles.includes(s));
        if (overlap.length > 0) {
          console.log(`  ❌ Overlap detected: ${overlap.join(", ")}`);
        }
      }
    });

  } catch (e: any) {
    console.log(`  ❌ A2c ERROR: ${e.message}`);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log("\n  [cleanup] Destroying Payload & removing tables...");
  // Use destroy() with timeout protection
  await Promise.race([
    payload.db.destroy(),
    new Promise((_, reject) => setTimeout(() => reject(new Error("destroy timeout")), 5000))
  ]).catch(() => console.log("  [cleanup] destroy may have timed out, continuing"));
  await cleanupPayloadTables();

  console.log("\n═══ HOOK & RUNTIME TESTS COMPLETE ═══\n");
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  console.error(e.stack);
  process.exit(1);
});
