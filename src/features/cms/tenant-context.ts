import { sql } from "drizzle-orm";

type CmsReq = { user?: { organizationId?: string } } & Record<string, unknown>;

/**
 * beforeOperation hook that sets app.organization_id GUC inside the
 * Payload DB transaction before any write operation (create/update/delete).
 *
 * RLS on pages/media/theme uses this GUC to enforce tenant isolation on
 * writes (SELECT is permissive — USING true). The hook runs inside the
 * transaction (confirmed by Payload's create/update/delete operation
 * code), so the GUC is scoped to the transaction and automatically
 * cleaned up on commit/rollback.
 */
export async function setTenantContext(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any;
  operation: string;
}): Promise<void> {
  const { req, operation } = args;

  // Only writes need the GUC — SELECT has USING (true) policy
  if (operation !== "create" && operation !== "update" && operation !== "delete") {
    return;
  }

  const orgId = (req as unknown as CmsReq).user?.organizationId;
  if (!orgId) return;

  const adapter = req.payload?.db;
  if (!adapter) return;

  // For write operations, Payload creates a transaction (initTransaction)
  // before beforeOperation runs. Access the transactional DB handle to
  // set the GUC inside the same transaction as the subsequent INSERT.
  const tid = await req.transactionID;
  const dbInstance = tid ? adapter.sessions?.[tid]?.db : adapter.drizzle;

  if (dbInstance) {
    await dbInstance.execute(
      sql`SELECT set_config('app.organization_id', ${orgId}, true)`,
    );
  }
}
