import type { AuditActor } from "@/features/admin/audit";
import { recordAudit } from "@/features/admin/audit";
import { upsertClient } from "@/features/client-auth/data";
import { insertAthlete } from "@/features/clients/data";
import { withTenant } from "@/lib/db/tenant";
import type { CsvImportError, CsvImportReport, CsvRowResult } from "./parser";
import { validateRow } from "./parser";

export async function importCsv(
  organizationId: string,
  results: CsvRowResult[],
  actor: AuditActor,
): Promise<CsvImportReport> {
  const failed: CsvImportError[] = [];
  let imported = 0;
  const seen = new Map<string, number>();
  const total = results.length;

  for (const { row, rowNumber } of results) {

    const validationError = validateRow(row);
    if (validationError) {
      failed.push({ row: rowNumber, email: row.email, reason: validationError });
      continue;
    }

    const dedupKey = `${row.email}::${row.childName}`;
    if (seen.has(dedupKey)) {
      failed.push({
        row: rowNumber,
        email: row.email,
        reason: `duplicate_child: first at row ${seen.get(dedupKey)}`,
      });
      continue;
    }
    seen.set(dedupKey, rowNumber);

    try {
      await withTenant(organizationId, async (tx) => {
        const parent = await upsertClient(tx, organizationId, row.email, {
          name: row.parentName ?? null,
          phone: row.phone ?? null,
        });

        await insertAthlete(tx, organizationId, parent.id, {
          name: row.childName,
          age: row.age ? parseInt(row.age, 10) : undefined,
          emergencyContactName: row.emergencyContactName || undefined,
          emergencyContactPhone: row.emergencyContactPhone || undefined,
          healthNotes: row.healthNotes || undefined,
        });
      });
      imported += 1;
    } catch (error) {
      let reason = "unknown_error";
      if (error instanceof Error) {
        const obj = error as unknown as Record<string, unknown>;
        const cause = obj.cause as Record<string, unknown> | undefined;
        if (cause?.code) {
          reason = `${String(cause.code)}: ${String(cause.detail ?? cause.message ?? "unknown")}`;
        } else if (cause?.message) {
          reason = String(cause.message);
        } else {
          reason = error.message;
        }
      }
      failed.push({
        row: rowNumber,
        email: row.email,
        reason,
      });
    }
  }

  await withTenant(organizationId, async (tx) => {
    await recordAudit(tx, {
      action: "data.import_csv",
      actor,
      organizationId,
      targetType: "client",
      targetId: organizationId,
      targetLabel: organizationId,
      metadata: {
        imported,
        failed: failed.length,
        total,
      },
    });
  });

  return { imported, failed, total };
}
