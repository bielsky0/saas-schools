import { count, desc, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { webhookEvent } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";

interface WebhookHealthPanelProps {
  orgId: string;
}

/**
 * Stripe Connect webhook health panel (Faza 5.3).
 *
 * Surfaces the `webhook_event` ledger for one organization: how many deliveries
 * were processed vs. failed vs. dead-lettered, plus the most recent events with
 * their attempts and last error. A dead-lettered row means the
 * `webhooks.monitor-stuck` sweep gave up on an event after
 * `WEBHOOK_MAX_ATTEMPTS` and alerted the owner — this panel is where an owner
 * sees the aftermath.
 *
 * `webhook_event` is under FORCE RLS (migration 0017), so the read runs inside
 * `withTenant` — same isolation contract as every other org-scoped data access.
 */
export async function WebhookHealthPanel({ orgId }: WebhookHealthPanelProps) {
  const t = await getTranslations("billing.webhooks");
  const locale = await getLocale();

  const { counts, recent } = await withTenant(orgId, async (tx) => {
    const [counts, recent] = await Promise.all([
      tx
        .select({
          status: webhookEvent.status,
          count: count(),
        })
        .from(webhookEvent)
        .where(eq(webhookEvent.organizationId, orgId))
        .groupBy(webhookEvent.status),
      tx
        .select({
          id: webhookEvent.providerEventId,
          type: webhookEvent.type,
          status: webhookEvent.status,
          attemptCount: webhookEvent.attemptCount,
          lastError: webhookEvent.lastError,
          lastAttemptAt: webhookEvent.lastAttemptAt,
        })
        .from(webhookEvent)
        .where(eq(webhookEvent.organizationId, orgId))
        .orderBy(desc(webhookEvent.createdAt))
        .limit(10),
    ]);
    return { counts, recent };
  });

  const byStatus = new Map(counts.map((row) => [row.status, row.count]));
  const processed = byStatus.get("processed") ?? 0;
  const failed = byStatus.get("failed") ?? 0;
  const dead = byStatus.get("dead") ?? 0;

const variantFor = (status: string): "success" | "warning" | "destructive" | "outline" =>
  status === "processed"
    ? "success"
    : status === "dead"
      ? "destructive"
      : status === "failed"
        ? "warning"
        : "outline";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("heading")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">
          {t("summary", {
            processed: String(processed),
            failed: String(failed),
            dead: String(dead),
          })}
        </p>

        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("event")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("attempts")}</TableHead>
                <TableHead>{t("error")}</TableHead>
                <TableHead>{t("lastAttempt")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell className="text-sm">{row.type}</TableCell>
                  <TableCell>
                    <Badge variant={variantFor(row.status)}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.attemptCount}</TableCell>
                  <TableCell className="text-muted-foreground max-w-60 truncate text-xs">
                    {row.lastError ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {row.lastAttemptAt ? new Date(row.lastAttemptAt).toLocaleString(locale) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}