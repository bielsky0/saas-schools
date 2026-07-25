"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { getEarningsReportAction } from "@/features/trainers/rate-actions";
import type { EarningsReportData } from "@/features/trainers/rate-actions";

interface Props {
  trainers: { id: string; name: string | null }[];
  /** If true, force-scope to the caller's own data — no trainer picker. */
  selfScope?: boolean;
}

export function EarningsReportClient({ trainers, selfScope }: Props) {
  const t = useTranslations("dashboard.trainers");
  const [state, action, pending] = useActionState(
    async (_prev: EarningsReportData | null, formData: FormData) => {
      return getEarningsReportAction(formData);
    },
    null as EarningsReportData | null,
  );

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateFrom">{t("earningsDateFrom")}</Label>
          <Input id="dateFrom" name="dateFrom" type="date" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="dateTo">{t("earningsDateTo")}</Label>
          <Input id="dateTo" name="dateTo" type="date" required />
        </div>

        {!selfScope ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="trainerId">{t("earningsFilterTrainer")}</Label>
            <Select name="trainerId">
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("earningsAllTrainers")} />
              </SelectTrigger>
              <SelectContent>
                {trainers.map((tr) => (
                  <SelectItem key={tr.id} value={tr.id}>
                    {tr.name ?? tr.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {selfScope ? <input type="hidden" name="trainerId" value={selfScope ? "self" : ""} /> : null}

        <Button type="submit" disabled={pending}>
          {pending ? t("earningsGenerating") : t("earningsGenerate")}
        </Button>
      </form>

      {state ? (
        state.lines.length === 0 && state.noRateSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("earningsEmpty")}</p>
        ) : (
          <>
            {state.lines.length > 0 ? (
              <div className="flex flex-col gap-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colSessionDate")}</TableHead>
                      <TableHead>{t("colGroup")}</TableHead>
                      <TableHead>{t("colDuration")}</TableHead>
                      <TableHead>{t("colRateType")}</TableHead>
                      <TableHead className="text-right">{t("colCalculatedAmount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.lines.map((line) => (
                      <TableRow key={line.sessionId}>
                        <TableCell>{line.startTime.toLocaleDateString()}</TableCell>
                        <TableCell>{line.groupTypeName}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {Math.round((line.endTime.getTime() - line.startTime.getTime()) / 60000)} min
                        </TableCell>
                        <TableCell>
                          <Badge variant={line.rateType === "hourly" ? "default" : "outline"}>
                            {line.rateType === "hourly" ? t("hourly") : t("flat_per_session")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {(line.calculatedAmount / 100).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <p className="text-right text-lg font-semibold">
                  {t("earningsTotal")}: {(state.total / 100).toFixed(2)}
                </p>
              </div>
            ) : null}

            {state.noRateSessions.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-medium text-destructive">{t("earningsNoRateTitle")}</h2>
                <p className="text-muted-foreground text-sm">{t("earningsNoRateDescription")}</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("colSessionDate")}</TableHead>
                      <TableHead>{t("colGroup")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.noRateSessions.map((s) => (
                      <TableRow key={s.sessionId}>
                        <TableCell>{s.startTime.toLocaleDateString()}</TableCell>
                        <TableCell>{s.groupTypeName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}
