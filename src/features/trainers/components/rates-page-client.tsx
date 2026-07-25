"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import type { TrainerRateRow } from "@/features/trainers/rate-data";
import { deleteRateAction } from "@/features/trainers/rate-actions";
import { AddRateForm } from "./rate-form";

interface Props {
  rates: TrainerRateRow[];
  trainers: { id: string; name: string | null }[];
  groupTypes: { id: string; name: string }[];
}

export function RatesPageClient({ rates, trainers, groupTypes }: Props) {
  const t = useTranslations("dashboard.trainers");

  const trainerMap = new Map(trainers.map((tr) => [tr.id, tr.name ?? tr.id]));
  const groupTypeMap = new Map(groupTypes.map((gt) => [gt.id, gt.name]));

  const [deleteState, deleteAction, deletePending] = useActionState(deleteRateAction, {});

  return (
    <div className="flex flex-col gap-8">
      {rates.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colTrainer")}</TableHead>
              <TableHead>{t("colGroupType")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
              <TableHead>{t("colEffectiveFrom")}</TableHead>
              <TableHead>{t("colRateType")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{trainerMap.get(r.trainerId) ?? r.trainerId}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.groupTypeId ? (groupTypeMap.get(r.groupTypeId) ?? r.groupTypeId) : <Badge variant="outline">{t("baseRate")}</Badge>}
                </TableCell>
                <TableCell>{(r.amount / 100).toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {r.effectiveFrom.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={r.rateType === "hourly" ? "default" : "outline"}>
                    {r.rateType === "hourly" ? t("hourly") : t("flat_per_session")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <form className="inline" action={deleteAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost" size="sm" disabled={deletePending}>
                      {t("delete")}
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {deleteState?.error ? <p className="text-xs text-destructive">{deleteState.error}</p> : null}
      {deleteState?.success ? <p className="text-xs text-green-600">{deleteState.success}</p> : null}

      <AddRateForm trainers={trainers} groupTypes={groupTypes} />
    </div>
  );
}
