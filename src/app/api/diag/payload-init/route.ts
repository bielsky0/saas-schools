import { Pool } from "pg";
import { getPayload, buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";

import { env } from "@/lib/env/server";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;

// Build minimal config ONCE (module level)
const testConfig = buildConfig({
  secret: env.BETTER_AUTH_SECRET,
  admin: { disable: true },
  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URL, max: 1 },
    blocksAsJSON: false,
  }),
  collections: [],
  endpoints: [],
} as any);

export async function GET() {
  const t0 = Date.now();
  const marks: string[] = [];

  marks.push(`module built at +${Date.now() - t0}ms`);

  // 1st call to getPayload (same key)
  const p1 = await getPayload({ config: testConfig, key: "diag-test" });
  marks.push(`1st getPayload at +${Date.now() - t0}ms`);

  // 2nd call (same key) — should be instant
  const p2 = await getPayload({ config: testConfig, key: "diag-test" });
  marks.push(`2nd getPayload at +${Date.now() - t0}ms`);

  // 3rd call (different key) — should create new instance
  const p3 = await getPayload({ config: testConfig, key: "diag-test-2" });
  marks.push(`3rd getPayload (diff key) at +${Date.now() - t0}ms`);

  // 4th call (same as p3 key) — should be instant
  const p4 = await getPayload({ config: testConfig, key: "diag-test-2" });
  marks.push(`4th getPayload (same as p3) at +${Date.now() - t0}ms`);

  return Response.json({
    ok: true,
    durationMs: Date.now() - t0,
    marks,
    same12: p1 === p2,
    same34: p3 === p4,
    same13: p1 === p3,
  });
}
