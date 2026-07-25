import { getLocale, getTranslations } from "next-intl/server";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { CancelMyBookingButton } from "@/features/bookings/components/cancel-my-booking-button";
import { getActiveBookingsForClient } from "@/features/bookings/data";
import { resolveClientSession } from "@/features/client-auth/session";
import { RequestInvoiceButton } from "@/features/billing/components/request-invoice-button";
import { listClientPurchases } from "@/features/billing/invoice-data";
import { listAvailableCredits } from "@/features/credits/data";
import { listGradesForClient, listProgressNotesForClient } from "@/features/grades/data";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export default async function MyBookingsPage() {
  const org = await requireServedOrganization();
  const locale = await getLocale();
  const t = await getTranslations("enrollment");
  const tc = await getTranslations("credits");

  const principal = await resolveClientSession(org.id);
  if (!principal || !principal.isVerified) {
    return <p>{t("errors.verifyFirst")}</p>;
  }

  const [bookings, credits, grades, notes, purchases] = await withTenant(org.id, async (tx) => {
    const [b, c, g, n, p] = await Promise.all([
      getActiveBookingsForClient(tx, org.id, principal.clientId),
      listAvailableCredits(tx, org.id, principal.clientId),
      listGradesForClient(tx, org.id, principal.clientId),
      listProgressNotesForClient(tx, org.id, principal.clientId),
      listClientPurchases(tx, org.id, principal.clientId),
    ]);
    return [b, c, g, n, p] as const;
  });

  const formatWhen = new Intl.DateTimeFormat(locale, {
    timeZone: org.timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });

  const formatDate = new Intl.DateTimeFormat(locale, {
    timeZone: org.timezone,
    dateStyle: "medium",
  });

  const money = (minor: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: org.currency }).format(
      minor / 100,
    );

  const sourceLabels: Record<string, string> = {
    cancellation: t("source.cancellation"),
    manual_admin_grant: t("source.manual_admin_grant"),
    subscription_purchase: t("source.subscription_purchase"),
    admin_session_cancellation: t("source.admin_session_cancellation"),
    package_cash: t("source.package_cash"),
    package_online: t("source.package_online"),
    subscription_renewal: t("source.subscription_renewal"),
  };

  const hasGradesOrNotes = grades.length > 0 || notes.length > 0;

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("myBookings")}</h1>

      <section>
        <h2 className="mb-3 text-lg font-medium">{t("table.session")}</h2>
        {bookings.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noBookings")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.session")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((row) => {
                const isPast = row.sessionStartTime < new Date();
                return (
                  <TableRow key={row.bookingId}>
                    <TableCell>
                      <div className="font-medium">{row.groupTypeName}</div>
                      <div className="text-muted-foreground text-sm">
                        {formatWhen.format(row.sessionStartTime)}
                      </div>
                    </TableCell>
                    <TableCell>{row.paymentStatus}</TableCell>
                    <TableCell className="text-right">
                      {!isPast ? (
                        <CancelMyBookingButton bookingId={row.bookingId} />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      {credits.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">{t("walletTitle")}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.session")}</TableHead>
                <TableHead>{tc("table.source")}</TableHead>
                <TableHead>{tc("table.validUntil")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credits.map((cr) => (
                <TableRow key={cr.id}>
                  <TableCell className="font-medium">{cr.creditTypeName}</TableCell>
                  <TableCell>{sourceLabels[cr.source] ?? cr.source}</TableCell>
                  <TableCell>{formatDate.format(cr.validUntil)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      {purchases.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">{tc("purchase.title")}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc("invoice.package")}</TableHead>
                <TableHead>{tc("invoice.amount")}</TableHead>
                <TableHead className="text-right">{tc("invoice.request")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.productTemplateName}</TableCell>
                  <TableCell>{money(p.pricePaid)}</TableCell>
                  <TableCell className="text-right">
                    {p.invoiceRequestedAt ? (
                      <span className="text-muted-foreground text-sm">{tc("invoice.requested")}</span>
                    ) : (
                      <RequestInvoiceButton purchaseId={p.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      {hasGradesOrNotes ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">{t("gradesTitle")}</h2>
          <div className="space-y-4">
            {grades.map((g) => (
              <div key={`grade-${g.id}`} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{g.fieldName}</span>
                  <span className="text-muted-foreground text-xs">
                    {g.athleteName} &middot; {formatDate.format(g.createdAt)}
                  </span>
                </div>
                <p className="mt-1">{g.value}</p>
              </div>
            ))}
            {notes.map((n) => (
              <div key={`note-${n.id}`} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{t("gradesTitle")}</span>
                  <span className="text-muted-foreground text-xs">
                    {n.athleteName} &middot; {formatDate.format(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{n.content}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
