import { NextResponse } from "next/server";

import { getFileForOwner } from "@/features/storage/data";
import { storage } from "@/lib/adapters/storage";
import { withOwner } from "@/lib/db/tenant";

/**
 * Public policy document file endpoint.
 *
 * Returns a presigned/public URL for a file stored as a policy document.
 * Unlike the org-scoped `/api/storage/file/[id]`, this endpoint does NOT
 * require an org membership session — clients on the enrollment page can
 * view the policy document they are about to accept.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  const organizations = await fetchOrganizationIdsContainingFile(fileId);
  if (organizations.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  for (const orgId of organizations) {
    const owner = { kind: "organization" as const, organizationId: orgId };
    const row = await withOwner(owner, (tx) => getFileForOwner(tx, owner, fileId));
    if (row) {
      const url =
        row.visibility === "public"
          ? storage.publicUrl(row.key)
          : await storage.createReadUrl({ key: row.key, expiresIn: 300 });
      return NextResponse.json({ url });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/**
 * Fetch all organization IDs that reference this file in a policy_document row.
 */
async function fetchOrganizationIdsContainingFile(fileId: string): Promise<string[]> {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { policyDocument } = await import("@/lib/db/schema");

  const rows = await db
    .select({ organizationId: policyDocument.organizationId })
    .from(policyDocument)
    .where(sql`${policyDocument.file_id} = ${fileId}`)
    .limit(5);

  return rows.map((r) => r.organizationId);
}
