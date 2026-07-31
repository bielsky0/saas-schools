import { CalendarX2, CreditCard, Settings2, Star } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { CancelMyBookingButton } from "@/features/bookings/components/cancel-my-booking-button";
import { getActiveBookingsForClient } from "@/features/bookings/data";
import { resolveClientSession } from "@/features/client-auth/session";
import { RequestInvoiceButton } from "@/features/billing/components/request-invoice-button";
import { listClientPurchases } from "@/features/billing/invoice-data";
import { listAvailableCredits } from "@/features/credits/data";
import { listGradesForClient, listProgressNotesForClient } from "@/features/grades/data";
import { requireServedOrganization } from "@/features/organizations/served-org";
import { withTenant } from "@/lib/db/tenant";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

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
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t("greeting", { name: principal.name ?? principal.email })}</h1>
          <p className="text-muted-foreground text-sm">{org.name}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/moje-zajecia/ustawienia/powiadomienia">
            <Settings2 className="size-4" />
            <span className="hidden sm:inline">{t("settings")}</span>
          </Link>
        </Button>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-medium">{t("table.session")}</h2>
        {bookings.length === 0 ? (
          <EmptyState icon={CalendarX2} text={t("noBookings")}>
            <Button asChild size="sm">
              <Link href="/zapisy">{t("browseOffer")}</Link>
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("table.session")}</TableHead>
                    <TableHead>{t("table.status")}</TableHead>
                    <TableHead className="text-right">{t("table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((row) => (
                    <BookingRow key={row.bookingId} row={row} formatWhen={formatWhen} t={t} />
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="space-y-3 md:hidden">
              {bookings.map((row) => (
                <BookingCard key={row.bookingId} row={row} formatWhen={formatWhen} t={t} />
              ))}
            </ul>
          </>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">{t("walletTitle")}</h2>
        {credits.length === 0 ? (
          <EmptyState icon={CreditCard} text={t("walletEmpty")} />
        ) : (
          <>
            <div className="hidden md:block">
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
            </div>
            <ul className="space-y-3 md:hidden">
              {credits.map((cr) => (
                <li key={cr.id} className="rounded-lg border p-3">
                  <p className="font-medium">{cr.creditTypeName}</p>
                  <p className="text-muted-foreground text-sm">{sourceLabels[cr.source] ?? cr.source}</p>
                  <p className="text-muted-foreground text-sm">{tc("validUntilLabel")}: {formatDate.format(cr.validUntil)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {purchases.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">{tc("purchase.title")}</h2>
          <div className="hidden md:block">
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
          </div>
          <ul className="space-y-3 md:hidden">
            {purchases.map((p) => (
              <li key={p.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{p.productTemplateName}</p>
                  <p className="font-medium">{money(p.pricePaid)}</p>
                </div>
                <div className="mt-1">
                  {p.invoiceRequestedAt ? (
                    <span className="text-muted-foreground text-sm">{tc("invoice.requested")}</span>
                  ) : (
                    <RequestInvoiceButton purchaseId={p.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-medium">{t("gradesTitle")}</h2>
        {hasGradesOrNotes ? (
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
        ) : (
          <EmptyState icon={Star} text={t("gradesEmpty")} />
        )}
      </section>
    </main>
  );
}

function BookingRow({
  row,
  formatWhen,
  t,
}: {
  row: Awaited<ReturnType<typeof getActiveBookingsForClient>>[number];
  formatWhen: Intl.DateTimeFormat;
  t: Awaited<ReturnType<typeof getTranslations<"enrollment">>>;
}) {
  return (
    <TableRow key={row.bookingId}>
      <TableCell>
        <div className="font-medium">{row.groupTypeName}</div>
        <div className="text-muted-foreground text-sm">{formatWhen.format(row.sessionStartTime)}</div>
      </TableCell>
      <TableCell>
        <Badge variant={row.paymentStatus === "confirmed" ? "default" : "outline"}>
          {row.paymentStatus}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-col items-end gap-2">
          <BookingActions row={row} t={t} />
        </div>
      </TableCell>
    </TableRow>
  );
}

function BookingCard({
  row,
  formatWhen,
  t,
}: {
  row: Awaited<ReturnType<typeof getActiveBookingsForClient>>[number];
  formatWhen: Intl.DateTimeFormat;
  t: Awaited<ReturnType<typeof getTranslations<"enrollment">>>;
}) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">{row.groupTypeName}</p>
        <Badge variant={row.paymentStatus === "confirmed" ? "default" : "outline"}>
          {row.paymentStatus}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{formatWhen.format(row.sessionStartTime)}</p>
      <div className="mt-2">
        <BookingActions row={row} t={t} />
      </div>
    </li>
  );
}

function BookingActions({
  row,
  t,
}: {
  row: Awaited<ReturnType<typeof getActiveBookingsForClient>>[number];
  t: Awaited<ReturnType<typeof getTranslations<"enrollment">>>;
}) {
  const isPast = row.sessionStartTime < new Date();
  const now = new Date().getTime();
  const meetingActive =
    row.meetingUrl &&
    now >= row.sessionStartTime.getTime() - 15 * 60 * 1000 &&
    now <= row.sessionEndTime.getTime();

  return (
    <div className="flex flex-col items-end gap-2 md:flex-row">
      {row.meetingUrl ? (
        <Button asChild size="sm" variant="outline" disabled={!meetingActive}>
          <a href={row.meetingUrl} target="_blank" rel="noopener noreferrer">
            {t("joinMeeting")}
          </a>
        </Button>
      ) : null}
      {!isPast ? <CancelMyBookingButton bookingId={row.bookingId} /> : null}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  text,
  children,
}: {
  icon: React.ElementType;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center",
      )}
    >
      <Icon className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">{text}</p>
      {children}
    </div>
  );
}
