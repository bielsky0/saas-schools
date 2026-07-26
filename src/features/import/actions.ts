"use server";

import { revalidatePath } from "next/cache";
import { resolveActor } from "@/features/admin/audit";
import { requireOrgPermission } from "@/features/organizations/context";
import type { FormState } from "@/lib/validation";
import { importCsv } from "./import-csv";
import { parseCsv } from "./parser";

export async function importCsvAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireOrgPermission("data.import");
  const actor = await resolveActor(ctx.session);

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { error: "No file provided" };
  }

  if (file.size === 0) {
    return { error: "File is empty" };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: "Failed to read file" };
  }

  const { rows, headerErrors, rowErrors: parseErrors } = parseCsv(text);
  if (headerErrors.some((e) => e.startsWith("csv_empty") || e.startsWith("missing_required"))) {
    return { error: headerErrors.join("; ") };
  }

  const report = await importCsv(ctx.org.id, rows, actor);

  revalidatePath("/dashboard/import");

  const allErrors = [...parseErrors, ...report.failed];

  if (allErrors.length === (rows.length + parseErrors.length) && allErrors.length > 0) {
    return {
      error: `All ${allErrors.length} rows failed to import.`,
      fieldErrors: {
        report: allErrors.map((f) => `Row ${f.row}: ${f.reason}`),
      },
    };
  }

  if (allErrors.length > 0) {
    return {
      success: `Imported ${report.imported} of ${report.total} rows. ${allErrors.length} rows failed.`,
      fieldErrors: {
        report: allErrors.map((f) => `Row ${f.row}: ${f.reason}`),
      },
    };
  }

  return { success: `Successfully imported ${report.imported} rows.` };
}
