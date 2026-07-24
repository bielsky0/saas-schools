import { and, desc, eq, isNull } from "drizzle-orm";

import { groupType, policyAcceptance, policyDocument } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export async function createPolicyDocument(
  tx: TenantDb,
  values: {
    organizationId: string;
    name: string;
    file_id: string;
    version?: number;
  },
) {
  const [row] = await tx
    .insert(policyDocument)
    .values({
      organizationId: values.organizationId,
      name: values.name,
      file_id: values.file_id,
      version: values.version ?? 1,
    })
    .returning();
  return row;
}

export async function listPolicyDocuments(tx: TenantDb, organizationId: string) {
  return tx
    .select()
    .from(policyDocument)
    .where(and(eq(policyDocument.organizationId, organizationId), isNull(policyDocument.deletedAt)))
    .orderBy(desc(policyDocument.createdAt));
}

export async function getPolicyDocument(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select()
    .from(policyDocument)
    .where(
      and(
        eq(policyDocument.id, id),
        eq(policyDocument.organizationId, organizationId),
        isNull(policyDocument.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getActivePolicyForGroupType(
  tx: TenantDb,
  organizationId: string,
  groupTypeId: string,
) {
  const [gt] = await tx
    .select({ pid: groupType.policyDocumentId })
    .from(groupType)
    .where(and(eq(groupType.id, groupTypeId), eq(groupType.organizationId, organizationId)))
    .limit(1);
  if (!gt?.pid) return null;

  const [row] = await tx
    .select()
    .from(policyDocument)
    .where(
      and(
        eq(policyDocument.id, gt.pid),
        eq(policyDocument.organizationId, organizationId),
        eq(policyDocument.isActive, true),
        isNull(policyDocument.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function deactivatePolicyDocument(tx: TenantDb, organizationId: string, id: string) {
  await tx
    .update(policyDocument)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(policyDocument.id, id), eq(policyDocument.organizationId, organizationId)));
}

export async function insertPolicyAcceptance(
  tx: TenantDb,
  values: {
    organizationId: string;
    clientId: string;
    groupTypeId: string;
    policyDocumentId: string;
    policyDocumentVersion: number;
    ipAddress?: string;
  },
) {
  const [row] = await tx.insert(policyAcceptance).values(values).returning();
  return row;
}

export async function getLatestAcceptanceForClientGroupType(
  tx: TenantDb,
  organizationId: string,
  clientId: string,
  groupTypeId: string,
) {
  const [row] = await tx
    .select()
    .from(policyAcceptance)
    .where(
      and(
        eq(policyAcceptance.organizationId, organizationId),
        eq(policyAcceptance.clientId, clientId),
        eq(policyAcceptance.groupTypeId, groupTypeId),
      ),
    )
    .orderBy(desc(policyAcceptance.acceptedAt))
    .limit(1);
  return row ?? null;
}

export async function listPolicyAcceptances(
  tx: TenantDb,
  organizationId: string,
  options?: { clientId?: string },
) {
  const conditions = [eq(policyAcceptance.organizationId, organizationId)];
  if (options?.clientId) {
    conditions.push(eq(policyAcceptance.clientId, options.clientId));
  }

  return tx
    .select({
      id: policyAcceptance.id,
      clientId: policyAcceptance.clientId,
      groupTypeId: policyAcceptance.groupTypeId,
      policyDocumentId: policyAcceptance.policyDocumentId,
      policyDocumentVersion: policyAcceptance.policyDocumentVersion,
      acceptedAt: policyAcceptance.acceptedAt,
      ipAddress: policyAcceptance.ipAddress,
    })
    .from(policyAcceptance)
    .where(and(...conditions))
    .orderBy(desc(policyAcceptance.acceptedAt));
}
