import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { withSystemBypass } from "@/lib/db/system";
import { withTenant } from "@/lib/db/tenant";
import { env } from "@/lib/env/server";
import { sqlStateOf } from "../sql-error";

/**
 * Test-only CMS tenant isolation probe (Faza 30a). Disabled in production.
 *
 * Two actions:
 *   "seed"   — insert a CMS page for a given org (bypasses RLS)
 *   "probe"  — run unfiltered SELECT inside withTenant (tests isolation)
 *
 * The probe SELECT omits the `organization_id` WHERE clause on purpose,
 * matching the pattern in `/api/dev/rls-probe`. A passing test proves the
 * RLS policy (or Payload access control) is what filters — not the app code.
 */
const CMS_TABLES = ["pages", "media", "theme"] as const;

type Body = {
  action?: "seed" | "probe";
  collection?: (typeof CMS_TABLES)[number];
  organizationId?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;
  const action = body.action ?? "probe";
  const collection = body.collection ?? "pages";
  const organizationId = body.organizationId ?? "";

  if (!CMS_TABLES.includes(collection as (typeof CMS_TABLES)[number])) {
    return NextResponse.json({ error: `Unknown collection: ${collection}` }, { status: 400 });
  }

  try {
    if (action === "seed") {
      if (!organizationId) {
        return NextResponse.json({ error: "organizationId is required for seed" }, { status: 400 });
      }
      const id = crypto.randomUUID();
      await withSystemBypass("cms-isolation-probe seed", async (tx) => {
        await tx.execute(
          sql.raw(
            `INSERT INTO "${collection}" (id, title, slug, organization_id, created_at, updated_at) VALUES (${id}, 'Probe Page', 'probe-${id.slice(0, 8)}', '${organizationId}', now(), now())`,
          ),
        );
      });
      return NextResponse.json({ ok: true, action: "seed", id, collection, organizationId });
    }

    if (!organizationId) {
      return NextResponse.json({ error: "organizationId is required for probe" }, { status: 400 });
    }

    const rows = await withTenant(organizationId, async (tx) => {
      const result = await tx.execute<{ id: string; organization_id: string }>(
        sql.raw(
          `SELECT id, organization_id FROM "${collection}" WHERE deleted_at IS NULL`,
        ),
      );
      return Array.from(result);
    });

    return NextResponse.json({
      ok: true,
      action: "probe",
      organizationId,
      collection,
      count: rows.length,
      rows: rows.map((r) => ({ id: r.id, organizationId: r.organization_id })),
    });
  } catch (error) {
    const sqlState = sqlStateOf(error);
    return NextResponse.json({
      ok: false,
      action,
      organizationId,
      collection,
      sqlState,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
