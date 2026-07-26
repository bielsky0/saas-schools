"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { convertInterestSignupAction, type ConvertInterestState } from "../actions";

interface InterestSignupRow {
  id: string;
  athleteName: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
  converted: boolean;
  convertedBookingId: string | null;
}

interface SessionOption {
  id: string;
  label: string;
}

const initial: ConvertInterestState = {};

export function InterestSignupList({
  rows,
  sessions,
}: {
  rows: InterestSignupRow[];
  sessions: SessionOption[];
}) {
  const t = useTranslations("groups");

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("interest.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("interest.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("interest.title")}</CardTitle>
        <p className="text-muted-foreground text-sm">{t("interest.subtitle")}</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("interest.athlete")}</TableHead>
              <TableHead>{t("interest.client")}</TableHead>
              <TableHead>{t("interest.date")}</TableHead>
              <TableHead>{t("interest.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <InterestSignupRowItem
                key={row.id}
                row={row}
                sessions={sessions}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function InterestSignupRowItem({
  row,
  sessions,
}: {
  row: InterestSignupRow;
  sessions: SessionOption[];
}) {
  const t = useTranslations("groups");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [showConvert, setShowConvert] = useState(false);
  const [state, formAction, pending] = useActionState(convertInterestSignupAction, initial);

  if (row.converted) {
    return (
      <TableRow>
        <TableCell>{row.athleteName}</TableCell>
        <TableCell>{row.clientName || row.clientEmail}</TableCell>
        <TableCell>{row.createdAt}</TableCell>
        <TableCell>
          <span className="text-muted-foreground text-sm">{t("interest.converted")}</span>
        </TableCell>
      </TableRow>
    );
  }

  if (state.success) {
    return (
      <TableRow>
        <TableCell>{row.athleteName}</TableCell>
        <TableCell>{row.clientName || row.clientEmail}</TableCell>
        <TableCell>{row.createdAt}</TableCell>
        <TableCell>
          <span className="text-green-700 text-sm">{t("interest.converted")}</span>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{row.athleteName}</TableCell>
      <TableCell>{row.clientName || row.clientEmail}</TableCell>
      <TableCell>{row.createdAt}</TableCell>
      <TableCell>
        {showConvert ? (
          <form action={formAction} className="flex flex-col gap-1">
            <input type="hidden" name="interestSignupId" value={row.id} />
            <Select name="sessionId" value={sessionId} onValueChange={setSessionId}>
              <SelectTrigger aria-label={t("interest.convert")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? t("interest.converting") : t("interest.convert")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowConvert(false)}
              >
                Cancel
              </Button>
            </div>
            {state.error ? (
              <p className="text-destructive text-xs">{state.error}</p>
            ) : null}
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={sessions.length === 0}
            onClick={() => setShowConvert(true)}
          >
            {t("interest.convert")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
