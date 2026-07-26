import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { athleteConsent, consentDocument } from "@/lib/db/schema";
import type { TenantDb } from "@/lib/db/tenant";

export async function createConsentDocument(
  tx: TenantDb,
  values: {
    organizationId: string;
    name: string;
    file_id?: string | null;
    body?: string | null;
    isRequiredAtSignup?: boolean;
  },
) {
  const [row] = await tx
    .insert(consentDocument)
    .values({
      organizationId: values.organizationId,
      name: values.name,
      file_id: values.file_id ?? null,
      body: values.body ?? null,
      isRequiredAtSignup: values.isRequiredAtSignup ?? false,
      version: 1,
    })
    .returning();
  if (!row) throw new Error("createConsentDocument: insert returned no row");
  return row;
}

export async function updateConsentDocument(
  tx: TenantDb,
  values: {
    organizationId: string;
    id: string;
    name?: string;
    file_id?: string | null;
    body?: string | null;
    isRequiredAtSignup?: boolean;
  },
) {
  const [old] = await tx
    .select()
    .from(consentDocument)
    .where(
      and(
        eq(consentDocument.id, values.id),
        eq(consentDocument.organizationId, values.organizationId),
        eq(consentDocument.isActive, true),
        isNull(consentDocument.deletedAt),
      ),
    )
    .limit(1)
    .for("update");
  if (!old) throw new Error("Consent document not found or not active");

  const newVersion = old.version + 1;

  const [inserted] = await tx
    .insert(consentDocument)
    .values({
      organizationId: values.organizationId,
      name: values.name ?? old.name,
      file_id: values.file_id !== undefined ? values.file_id : old.file_id,
      body: values.body !== undefined ? values.body : old.body,
      version: newVersion,
      isRequiredAtSignup: values.isRequiredAtSignup ?? old.isRequiredAtSignup,
      isActive: true,
      supersedesId: old.id,
    })
    .returning();
  if (!inserted) throw new Error("updateConsentDocument: insert returned no row");

  await tx
    .update(consentDocument)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(consentDocument.id, old.id),
        eq(consentDocument.organizationId, values.organizationId),
      ),
    );

  return inserted;
}

export async function listConsentDocuments(tx: TenantDb, organizationId: string) {
  return tx
    .select()
    .from(consentDocument)
    .where(
      and(
        eq(consentDocument.organizationId, organizationId),
        eq(consentDocument.isActive, true),
        isNull(consentDocument.deletedAt),
      ),
    )
    .orderBy(desc(consentDocument.createdAt));
}

export async function getConsentDocument(tx: TenantDb, organizationId: string, id: string) {
  const [row] = await tx
    .select()
    .from(consentDocument)
    .where(
      and(
        eq(consentDocument.id, id),
        eq(consentDocument.organizationId, organizationId),
        isNull(consentDocument.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getActiveConsentsForSignup(tx: TenantDb, organizationId: string) {
  return tx
    .select()
    .from(consentDocument)
    .where(
      and(
        eq(consentDocument.organizationId, organizationId),
        eq(consentDocument.isActive, true),
        eq(consentDocument.isRequiredAtSignup, true),
        isNull(consentDocument.deletedAt),
      ),
    )
    .orderBy(asc(consentDocument.name));
}

export async function deactivateConsentDocument(tx: TenantDb, organizationId: string, id: string) {
  await tx
    .update(consentDocument)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(eq(consentDocument.id, id), eq(consentDocument.organizationId, organizationId)),
    );
}

export async function insertAthleteConsent(
  tx: TenantDb,
  values: {
    organizationId: string;
    clientId: string;
    athleteId: string;
    consentDocumentId: string;
    consentDocumentVersion: number;
    granted: boolean;
    ipAddress?: string;
  },
) {
  const [row] = await tx.insert(athleteConsent).values(values).returning();
  if (!row) throw new Error("insertAthleteConsent: insert returned no row");
  return row;
}

export async function getLatestAthleteConsentForDocument(
  tx: TenantDb,
  organizationId: string,
  athleteId: string,
  consentDocumentId: string,
) {
  const [row] = await tx
    .select()
    .from(athleteConsent)
    .where(
      and(
        eq(athleteConsent.organizationId, organizationId),
        eq(athleteConsent.athleteId, athleteId),
        eq(athleteConsent.consentDocumentId, consentDocumentId),
      ),
    )
    .orderBy(desc(athleteConsent.acceptedAt))
    .limit(1);
  return row ?? null;
}

export async function getAthleteConsents(
  tx: TenantDb,
  organizationId: string,
  athleteId: string,
) {
  return tx
    .select()
    .from(athleteConsent)
    .where(
      and(
        eq(athleteConsent.organizationId, organizationId),
        eq(athleteConsent.athleteId, athleteId),
      ),
    )
    .orderBy(desc(athleteConsent.acceptedAt));
}
