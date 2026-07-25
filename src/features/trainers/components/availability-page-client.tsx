"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import type { AvailabilityRow } from "@/features/trainers/availability-data";
import { deleteAvailabilityAction } from "@/features/trainers/availability-actions";
import { AddAvailabilityForm } from "./availability-form";

interface Props {
  windows: AvailabilityRow[];
  trainerId: string;
}

export function AvailabilityPageClient({ windows, trainerId }: Props) {
  const t = useTranslations("dashboard.trainers");
  const td = useTranslations("groups.days");

  const [deleteState, deleteAction, deletePending] = useActionState(deleteAvailabilityAction, {});

  return (
    <div className="flex flex-col gap-8">
      {windows.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("availabilityEmpty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colDay")}</TableHead>
              <TableHead>{t("colHours")}</TableHead>
              <TableHead>{t("colLocation")}</TableHead>
              <TableHead>{t("colActive")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {windows.map((w) => (
              <TableRow key={w.id} className={w.isActive ? "" : "text-muted-foreground"}>
                <TableCell>{td(String(w.dayOfWeek) as "0" | "1" | "2" | "3" | "4" | "5" | "6")}</TableCell>
                <TableCell>
                  {w.startTime}–{w.endTime}
                </TableCell>
                <TableCell className="text-xs">{w.locationId ?? t("noLocation")}</TableCell>
                <TableCell>
                  <Badge variant={w.isActive ? "default" : "outline"}>
                    {w.isActive ? t("active") : "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <form className="inline" action={deleteAction}>
                    <input type="hidden" name="id" value={w.id} />
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

      <AddAvailabilityForm trainerId={trainerId} />
    </div>
  );
}
