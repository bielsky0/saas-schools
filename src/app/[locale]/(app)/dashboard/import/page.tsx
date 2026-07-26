import { getTranslations } from "next-intl/server";

import { requireOrgPermission } from "@/features/organizations/context";
import { ImportForm } from "./import-form";

export default async function ImportPage() {
  await requireOrgPermission("data.import");
  const t = await getTranslations("import");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <ImportForm />
    </div>
  );
}
