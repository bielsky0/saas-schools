import { and, eq, isNull } from "drizzle-orm";

import type { TenantDb } from "@/lib/db/tenant";
import { customDomain, organization } from "@/lib/db/schema";
import { getPlatformSubdomain } from "./dns-verify";

export interface CustomDomainRow {
  id: string;
  organizationId: string;
  domain: string;
  status: string;
  verificationToken: string;
  verifiedAt: Date | null;
  lastCheckedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDomain(
  tx: TenantDb,
  organizationId: string,
): Promise<CustomDomainRow | undefined> {
  const [row] = await tx
    .select()
    .from(customDomain)
    .where(eq(customDomain.organizationId, organizationId))
    .limit(1);

  return row;
}

export async function addDomain(
  tx: TenantDb,
  organizationId: string,
  domain: string,
): Promise<CustomDomainRow> {
  const verificationToken = crypto.randomUUID();
  const [row] = await tx
    .insert(customDomain)
    .values({
      organizationId,
      domain,
      verificationToken,
      status: "pending",
    })
    .returning();

  return row!;
}

export async function removeDomain(
  tx: TenantDb,
  organizationId: string,
  domainId: string,
): Promise<void> {
  await tx
    .delete(customDomain)
    .where(
      and(
        eq(customDomain.id, domainId),
        eq(customDomain.organizationId, organizationId),
      ),
    );
}

export async function updateDomainStatus(
  tx: TenantDb,
  organizationId: string,
  domainId: string,
  status: "active" | "failed",
  lastError?: string,
): Promise<void> {
  const updateFields: Partial<typeof customDomain.$inferInsert> = {
    status,
    lastCheckedAt: new Date(),
    updatedAt: new Date(),
  };

  if (status === "active") {
    updateFields.verifiedAt = new Date();
  }

  if (lastError !== undefined) {
    updateFields.lastError = lastError;
  }

  await tx
    .update(customDomain)
    .set(updateFields)
    .where(
      and(
        eq(customDomain.id, domainId),
        eq(customDomain.organizationId, organizationId),
      ),
    );
}

export async function getDomainById(
  tx: TenantDb,
  domainId: string,
  organizationId: string,
): Promise<CustomDomainRow | undefined> {
  const [row] = await tx
    .select()
    .from(customDomain)
    .where(
      and(
        eq(customDomain.id, domainId),
        eq(customDomain.organizationId, organizationId),
      ),
    )
    .limit(1);

  return row;
}

export async function getExpectedCnameTarget(
  organizationId: string,
): Promise<string> {
  const subdomain = await getPlatformSubdomain(organizationId);
  return `${subdomain}.langlion.pl`;
}

export async function findActiveDomain(
  domain: string,
): Promise<{ organizationId: string } | undefined> {
  const { db } = await import("@/lib/db");

  const [row] = await db
    .select({
      organizationId: customDomain.organizationId,
    })
    .from(customDomain)
    .innerJoin(
      organization,
      and(
        eq(customDomain.organizationId, organization.id),
        isNull(organization.deletedAt),
      ),
    )
    .where(
      and(
        eq(customDomain.domain, domain),
        eq(customDomain.status, "active"),
      ),
    )
    .limit(1);

  return row;
}

export async function dummyLookup(): Promise<void> {
  const { db } = await import("@/lib/db");
  await db
    .select({ count: customDomain.id })
    .from(customDomain)
    .where(eq(customDomain.status, "_dummy_"))
    .limit(1);
}
