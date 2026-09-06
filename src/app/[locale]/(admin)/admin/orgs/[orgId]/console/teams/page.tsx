import { Badge, Card, CardContent, CardHeader, CardTitle, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import { requireSuperAdmin } from "@/features/admin/context";
import { getOrgTeamsData } from "@/features/admin/org-console/data";
import { ConsoleInviteForm, ConsoleMemberActions } from "@/features/admin/components/console/teams-tools";

/**
 * Org-console teams tab (apex-dashboard-plan 4.2 teams).
 *
 * Invite (no manual passwords — `adminAuthAdapter` has no createUser, per the
 * Faza-4 kickoff decision), change roles, suspend within THIS org, and the
 * emergency impersonate (4.4). %>
 */
export default async function OrgConsoleTeamsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  await requireSuperAdmin(`/admin/orgs/${orgId}/console/teams`);

  const { members, invitations } = await getOrgTeamsData(orgId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite member</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsoleInviteForm organizationId={orgId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members in this organization.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{member.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.status}</TableCell>
                    <TableCell className="text-right">
                      <ConsoleMemberActions organizationId={orgId} member={member} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{invitation.role}</Badge>
                    </TableCell>
                    <TableCell>{invitation.status}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      <time dateTime={invitation.expiresAt.toISOString()}>
                        {invitation.expiresAt.toISOString().slice(0, 10)}
                      </time>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}