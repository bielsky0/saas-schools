import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrganizationDetail, listOrgPayments } from "@/features/admin/data";
import { OrgActions } from "@/features/admin/components/org-actions";
import { OrgStatusBadge } from "@/features/admin/components/org-status-badge";

/**
 * One organization with its management tabs (apex-dashboard-plan 2.2).
 *
 * Dane | Płatności | Grupy | Ustawienia | Konsola. Editing (timezone/currency/
 * planId, groups, settings, the client console) lands with Faza 4's
 * org-console — until then Grupy/Ustawienia/Konsola render empty states so the
 * navigation exists.
 */
export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/organizations/${orgId}`);

  const org = await getOrganizationDetail(orgId);
  if (!org) notFound();

  const payments = await listOrgPayments(orgId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground text-sm">/{org.slug}</span>
            <OrgStatusBadge status={org.status} />
            <Badge variant="outline">{org.planId ?? "free"}</Badge>
            {org.deletedAt ? <Badge variant="destructive">deleted</Badge> : null}
          </div>
        </div>
        <OrgActions
          organizationId={org.id}
          name={org.name}
          memberCount={org.memberCount}
          deleted={org.deletedAt !== null}
        />
      </div>

      <Tabs defaultValue="data">
        <TabsList>
          <TabsTrigger value="data">Dane</TabsTrigger>
          <TabsTrigger value="payments">Płatności</TabsTrigger>
          <TabsTrigger value="groups">Grupy</TabsTrigger>
          <TabsTrigger value="settings">Ustawienia</TabsTrigger>
          <TabsTrigger value="console">Konsola</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground text-sm">Active members</dt>
                  <dd>{org.memberCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Subscription</dt>
                  <dd>
                    {org.subscriptionStatus ?? "none"}
                    {org.seats ? ` · ${org.seats} seat${org.seats === 1 ? "" : "s"}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-sm">Created</dt>
                  <dd>
                    <time dateTime={org.createdAt.toISOString()}>
                      {org.createdAt.toISOString().slice(0, 10)}
                    </time>
                  </dd>
                </div>
                <div>
                  {/* Revenue to date, not MRR — see the note on listAllOrganizations. */}
                  <dt className="text-muted-foreground text-sm">Net revenue to date</dt>
                  <dd>
                    {org.revenue.length === 0
                      ? "—"
                      : org.revenue.map((entry) => (
                          <div key={entry.currency}>
                            {(entry.netMinor / 100).toFixed(2)} {entry.currency.toUpperCase()}
                          </div>
                        ))}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
            </CardHeader>
            <CardContent>
              {org.members.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  This organization has no members.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {org.members.map((member) => (
                      <TableRow key={member.userId}>
                        <TableCell>
                          <Link
                            href={`/admin/users/${member.userId}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {member.email}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{member.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No billing payments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          <time dateTime={payment.createdAt.toISOString()}>
                            {payment.createdAt.toISOString().slice(0, 10)}
                          </time>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "paid"
                                ? "success"
                                : payment.status === "refunded"
                                  ? "destructive"
                                  : "warning"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.reason ?? "—"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="pt-4">
          <Card>
            <CardContent className="text-muted-foreground space-y-2 pt-6 text-sm">
              <p>Group membership is managed from the Groups section.</p>
              <p>
                <Link
                  href="/admin/groups"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Open /admin/groups
                </Link>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-sm">
              Editable settings (timezone, currency, plan, overrides) arrive with
              the client console in Faza 4.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="console" className="pt-4">
          <Card>
            <CardContent className="text-muted-foreground pt-6 text-sm">
              The client console (settings, teams, limits, CMS pages, builder)
              arrives in Faza 4 at{" "}
              <code className="text-foreground">/admin/orgs/{org.id}/console</code>.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}