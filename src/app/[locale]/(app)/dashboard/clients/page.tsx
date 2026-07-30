import { and, count, desc, eq, ilike, inArray, isNull, ne, or } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";

import {
  Avatar,
  AvatarFallback,
  Badge,
  Input,
  Pagination,
  PaginationLink,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { withLocale } from "@/lib/i18n/config";
import { athlete, booking, client } from "@/lib/db/schema";
import { withTenant } from "@/lib/db/tenant";
import { Link } from "@/lib/i18n/navigation";

const PAGE_SIZE = 20;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { org } = await requireOrgPermission("members.invite");
  const [t, locale] = await Promise.all([
    getTranslations("dashboard.clients"),
    getLocale(),
  ]);

  const { q, page } = await searchParams;
  const currentPage = Math.max(0, parseInt(page ?? "0", 10) || 0);

  const { rows, total } = await withTenant(org.id, async (tx) => {
    const filters = [
      eq(client.organizationId, org.id),
      isNull(client.deletedAt),
    ];

    if (q) {
      const pattern = `%${q}%`;
      const match = or(
        ilike(client.name, pattern),
        ilike(client.email, pattern),
      );
      if (match) filters.push(match);
    }

    const [countRow] = await tx
      .select({ count: count() })
      .from(client)
      .where(and(...filters));
    const total = countRow?.count ?? 0;

    const rows = await tx
      .select({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        isVerified: client.isVerified,
        createdAt: client.createdAt,
      })
      .from(client)
      .where(and(...filters))
      .orderBy(desc(client.createdAt))
      .limit(PAGE_SIZE)
      .offset(currentPage * PAGE_SIZE);

    const clientIds = rows.map((r) => r.id);

    const [athleteCounts, bookingCounts] = clientIds.length > 0
      ? await Promise.all([
          tx
            .select({
              clientId: athlete.parentClientId,
              value: count(),
            })
            .from(athlete)
            .where(
              and(
                eq(athlete.organizationId, org.id),
                isNull(athlete.deletedAt),
                inArray(athlete.parentClientId, clientIds),
              ),
            )
            .groupBy(athlete.parentClientId),
          tx
            .select({
              clientId: athlete.parentClientId,
              value: count(),
            })
            .from(booking)
            .innerJoin(athlete, eq(athlete.id, booking.athleteId))
            .where(
              and(
                eq(athlete.organizationId, org.id),
                inArray(athlete.parentClientId, clientIds),
                ne(booking.paymentStatus, "cancelled"),
              ),
            )
            .groupBy(athlete.parentClientId),
        ])
      : [[], []];

    const athleteMap = new Map(athleteCounts.map((r) => [r.clientId, r.value]));
    const bookingMap = new Map(bookingCounts.map((r) => [r.clientId, r.value]));

    const rowsWithCounts = rows.map((r) => ({
      ...r,
      athleteCount: athleteMap.get(r.id) ?? 0,
      bookingCount: bookingMap.get(r.id) ?? 0,
    }));

    return { rows: rowsWithCounts, total };
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = withLocale("/dashboard/clients", locale);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 0) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <form method="GET" action={basePath} className="flex items-center gap-3">
        <Input
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t("search")}
          aria-label={t("searchLabel")}
          className="max-w-sm"
        />
        <button type="submit" className="hidden" />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.client")}</TableHead>
            <TableHead>{t("columns.email")}</TableHead>
            <TableHead>{t("columns.phone")}</TableHead>
            <TableHead className="text-center">{t("columns.children")}</TableHead>
            <TableHead className="text-center">{t("columns.bookings")}</TableHead>
            <TableHead>{t("columns.joined")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                {q ? t("emptySearch") : t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`${basePath}/${row.id}`}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {(row.name || row.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.name || "—"}</span>
                      {!row.isVerified && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 w-fit">
                          {t("unverified")}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{row.email}</TableCell>
                <TableCell className="text-muted-foreground">{row.phone || "—"}</TableCell>
                <TableCell className="text-center">{row.athleteCount}</TableCell>
                <TableCell className="text-center">{row.bookingCount}</TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {row.createdAt.toLocaleDateString(locale)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PaginationLink href={pageHref(currentPage - 1)} disabled={currentPage === 0}>
            {t("previous")}
          </PaginationLink>
          <span className="text-muted-foreground text-sm">
            {t("page", { page: currentPage + 1, total: totalPages })}
          </span>
          <PaginationLink href={pageHref(currentPage + 1)} disabled={currentPage >= totalPages - 1}>
            {t("next")}
          </PaginationLink>
        </Pagination>
      )}
    </div>
  );
}
