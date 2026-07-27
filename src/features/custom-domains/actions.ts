"use server";

import { revalidatePath } from "next/cache";

import { recordAudit, resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import { withTenant } from "@/lib/db/tenant";
import type { FormState } from "@/lib/validation";

import {
  addDomain,
  getDomain,
  getDomainById,
  removeDomain,
  updateDomainStatus,
} from "./data";
import { verifyCname } from "./dns-verify";
import { addDomainSchema, removeDomainSchema, verifyDomainSchema } from "./schema";

export type AddDomainState = FormState & { domain?: string; expectedCname?: string };

export async function addDomainAction(
  _prev: AddDomainState,
  formData: FormData,
): Promise<AddDomainState> {
  const { org, session } = await requireOrgPermission("custom_domain.manage");

  const parsed = addDomainSchema.safeParse({
    domain: formData.get("domain"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid domain" };
  }

  const { domain } = parsed.data;
  const actor = await resolveActor(session);

  try {
    const result = await withTenant(org.id, async (tx) => {
      const existing = await getDomain(tx, org.id);
      if (existing) {
        return { kind: "already-exists" as const, domain: existing.domain };
      }

      const row = await addDomain(tx, org.id, domain);

      const subdomain = org.id.toLowerCase();
      const expectedCname = `${subdomain}.langlion.pl`;

      await recordAudit(tx, {
        action: "custom_domain.add",
        targetType: "custom_domain",
        targetId: row.id,
        targetLabel: domain,
        organizationId: org.id,
        actor,
        metadata: { expectedCname },
      });

      return { kind: "success" as const, domain: row.domain, expectedCname };
    });

    if (result.kind === "already-exists") {
      return { error: `A custom domain is already configured: ${result.domain}` };
    }

    revalidatePath("/settings/custom-domain");
    return { domain: result.domain, expectedCname: result.expectedCname };
  } catch {
    return { error: "Failed to add domain" };
  }
}

export type VerifyDomainState = FormState & { verified?: boolean };

export async function verifyDomainAction(
  _prev: VerifyDomainState,
  formData: FormData,
): Promise<VerifyDomainState> {
  const { org, session } = await requireOrgPermission("custom_domain.manage");

  const parsed = verifyDomainSchema.safeParse({
    domainId: formData.get("domainId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { domainId } = parsed.data;
  const actor = await resolveActor(session);

  try {
    const result = await withTenant(org.id, async (tx) => {
      const row = await getDomainById(tx, domainId, org.id);
      if (!row) return { kind: "not-found" as const };
      if (row.status === "active") return { kind: "already-active" as const };

      const verifyResult = await verifyCname(row.domain, org.id);

      if (verifyResult.success) {
        await updateDomainStatus(tx, org.id, domainId, "active");

        await recordAudit(tx, {
          action: "custom_domain.verify_success",
          targetType: "custom_domain",
          targetId: row.id,
          targetLabel: row.domain,
          organizationId: org.id,
          actor,
        });

        return { kind: "verified" as const };
      } else {
        await updateDomainStatus(tx, org.id, domainId, "failed", verifyResult.error);

        await recordAudit(tx, {
          action: "custom_domain.verify_failure",
          targetType: "custom_domain",
          targetId: row.id,
          targetLabel: row.domain,
          organizationId: org.id,
          actor,
          metadata: { error: verifyResult.error },
        });

        return { kind: "failed" as const, error: verifyResult.error! };
      }
    });

    switch (result.kind) {
      case "not-found":
        return { error: "Domain not found" };
      case "already-active":
        return { verified: true };
      case "verified":
        revalidatePath("/settings/custom-domain");
        return { verified: true };
      case "failed":
        return { error: result.error };
    }
  } catch {
    return { error: "Domain verification failed" };
  }
}

export type RemoveDomainState = FormState;

export async function removeDomainAction(
  _prev: RemoveDomainState,
  formData: FormData,
): Promise<RemoveDomainState> {
  const { org, session } = await requireOrgPermission("custom_domain.manage");

  const parsed = removeDomainSchema.safeParse({
    domainId: formData.get("domainId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { domainId } = parsed.data;
  const actor = await resolveActor(session);

  try {
    await withTenant(org.id, async (tx) => {
      const row = await getDomainById(tx, domainId, org.id);
      if (!row) return;

      await recordAudit(tx, {
        action: "custom_domain.remove",
        targetType: "custom_domain",
        targetId: row.id,
        targetLabel: row.domain,
        organizationId: org.id,
        actor,
      });

      await removeDomain(tx, org.id, domainId);
    });

    revalidatePath("/settings/custom-domain");
    return {};
  } catch {
    return { error: "Failed to remove domain" };
  }
}
