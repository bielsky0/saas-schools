import { getLocale, getTranslations } from "next-intl/server";

import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { requireOrgPermission } from "@/features/organizations/context";
import { withLocale } from "@/lib/i18n/config";
import { withTenant } from "@/lib/db/tenant";
import { Link } from "@/lib/i18n/navigation";
import { listBlogPosts } from "@/features/blog/data";
import { DeletePostButton } from "./components/delete-post-button";

const PAGE_SIZE = 20;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { org } = await requireOrgPermission("cms.manage");
  const [t, locale] = await Promise.all([getTranslations("blog"), getLocale()]);

  const { q, status, page } = await searchParams;
  const activeStatus = status === "draft" || status === "published" ? status : undefined;
  const currentPage = Math.max(0, parseInt(page ?? "0", 10) || 0);

  const { rows, total } = await withTenant(org.id, (tx) =>
    listBlogPosts(tx, org.id, {
      status: activeStatus,
      q,
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
    }),
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = withLocale("/dashboard/blog", locale);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (activeStatus) params.set("status", activeStatus);
    if (p > 0) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/blog/new">{t("newPost")}</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" action={basePath} className="flex items-center gap-3">
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("search")}
            aria-label={t("searchLabel")}
            className="max-w-sm"
          />
          {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
          <button type="submit" className="hidden" />
        </form>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/blog"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {t("filterAll")}
          </Link>
          <Link
            href="/dashboard/blog?status=draft"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {t("filterDrafts")}
          </Link>
          <Link
            href="/dashboard/blog?status=published"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            {t("filterPublished")}
          </Link>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.title")}</TableHead>
            <TableHead>{t("columns.template")}</TableHead>
            <TableHead>{t("columns.status")}</TableHead>
            <TableHead>{t("columns.author")}</TableHead>
            <TableHead>{t("columns.updated")}</TableHead>
            <TableHead className="text-right">{t("columns.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground py-8 text-center"
              >
                {q ? t("emptySearch") : t("empty")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/blog/${row.id}`}
                    className="flex flex-col gap-0.5"
                  >
                    <span className="font-medium">{row.title}</span>
                    <span className="text-muted-foreground text-xs">/{row.slug}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.templateName ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === "published"
                        ? "success"
                        : row.status === "archived"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {row.status === "published"
                      ? t("statusPublished")
                      : row.status === "archived"
                        ? t("statusArchived")
                        : t("statusDraft")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.authorName ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {row.updatedAt.toLocaleDateString(locale)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/blog/${row.id}`}>{t("edit")}</Link>
                    </Button>
                    <DeletePostButton
                      postId={row.id}
                      postTitle={row.title}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <Link
            href={pageHref(currentPage - 1)}
            className="text-muted-foreground hover:text-foreground text-sm disabled:pointer-events-none"
            aria-disabled={currentPage === 0}
          >
            {t("previous")}
          </Link>
          <span className="text-muted-foreground text-sm">
            {t("page", { page: currentPage + 1, total: totalPages })}
          </span>
          <Link
            href={pageHref(currentPage + 1)}
            className="text-muted-foreground hover:text-foreground text-sm disabled:pointer-events-none"
            aria-disabled={currentPage >= totalPages - 1}
          >
            {t("next")}
          </Link>
        </div>
      )}
    </div>
  );
}
