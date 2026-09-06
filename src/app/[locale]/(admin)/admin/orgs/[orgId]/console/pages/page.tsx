import { notFound } from "next/navigation";

import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgPagesData } from "@/features/admin/org-console/data";
import { PublishPageButton } from "@/features/admin/components/console/publish-page-button";

/**
 * Org-console pages tab (apex-dashboard-plan 4.2 pages).
 *
 * CMS page list of the target org + Publish (which snapshots a `page_version`
 * before flipping status). Rollback/timeline land in Faza 6.
 */
export default async function OrgConsolePagesPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/pages`);

  const pages = await getOrgPagesData(orgId);
  if (!pages) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>CMS pages</CardTitle>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This organization has no CMS pages yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map((page) => (
                <TableRow key={page.id}>
                  <TableCell className="font-medium">
                    {page.title}
                    {page.isHome ? (
                      <Badge variant="outline" className="ml-2">
                        home
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                      /{page.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={page.status === "published" ? "success" : "outline"}>
                      {page.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    <time dateTime={page.updatedAt.toISOString()}>
                      {page.updatedAt.toISOString().slice(0, 10)}
                    </time>
                  </TableCell>
                  <TableCell className="text-right">
                    <PublishPageButton
                      organizationId={orgId}
                      pageId={page.id}
                      disabled={page.status === "published"}
                    />
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