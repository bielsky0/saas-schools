import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { listPolicyDocuments, listPolicyAcceptancesWithNames } from "@/features/policies/data";
import { withTenant } from "@/lib/db/tenant";
import { PoliciesPageClient } from "@/features/policies/components/policies-page-client";

export default async function PoliciesPage() {
  const { org } = await requireOrgPermission("group_types.manage");
  const t = await getTranslations("policies");

  const { documents, acceptances } = await withTenant(org.id, async (tx) => ({
    documents: await listPolicyDocuments(tx, org.id),
    acceptances: await listPolicyAcceptancesWithNames(tx, org.id),
  }));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <PoliciesPageClient documents={documents} acceptances={acceptances} />
    </div>
  );
}
