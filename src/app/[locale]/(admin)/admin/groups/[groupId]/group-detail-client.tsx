"use client";

import { useActionState, useEffect, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Trash2, UserPlus, UserRoundMinus } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  FormField,
  FormMessage,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@/components/ui";
import type { FormState } from "@/lib/validation";
import { OrgStatusBadge } from "@/features/admin/components/org-status-badge";
import {
  addOrgToGroupAction,
  removeOrgFromGroupAction,
  updateClientGroupAction,
  deleteClientGroupAction,
} from "@/features/admin/groups-actions";
import type { AdminGroupableOrg, AdminGroupMemberRow, AdminGroupRow } from "@/features/admin/groups";

const initial: FormState = {};

export function GroupDetailClient({
  group,
  members,
  groupableOrgs,
}: {
  group: AdminGroupRow;
  members: AdminGroupMemberRow[];
  groupableOrgs: AdminGroupableOrg[];
}) {
  return (
    <div className="space-y-8">
      <GroupEditCard group={group} />
      <MembersCard group={group} members={members} groupableOrgs={groupableOrgs} />
    </div>
  );
}

function GroupEditCard({ group }: { group: AdminGroupRow }) {
  const [updateState, update, updatePending] = useActionState(updateClientGroupAction, initial);
  const [deleteState, remove, deletePending] = useActionState(deleteClientGroupAction, initial);
  const router = useRouter();
  const deleteFormId = useId();

  useEffect(() => {
    if (updateState.success) {
      toast.success(updateState.success);
      router.refresh();
    }
  }, [updateState, router]);
  useEffect(() => {
    if (deleteState.success) {
      toast.success(deleteState.success);
      router.push("/admin/groups");
      router.refresh();
    }
  }, [deleteState, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{group.name}</span>
          <span className="text-muted-foreground font-mono text-xs font-normal">/{group.slug}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={update} className="flex flex-col gap-4" noValidate>
          <FormField label="Name" htmlFor="group-name">
            <Input id="group-name" name="name" defaultValue={group.name} required />
          </FormField>
          <FormField label="Description" htmlFor="group-description">
            <Textarea id="group-description" name="description" rows={3} defaultValue={group.description ?? ""} />
          </FormField>
          {updateState.error ? <FormMessage>{updateState.error}</FormMessage> : null}
          <div className="flex justify-end">
            <Button type="submit" variant="outline" disabled={updatePending}>
              <Save className="size-4" />
              {updatePending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>

        <Separator />

        {/* Delete — the ConfirmDialog ports to document.body, so the submit
            input cannot live inside the dialog: bound to the hidden form via
            the `form` attribute (same pattern as user-actions.tsx). */}
        {deleteState.error ? <FormMessage className="text-xs">{deleteState.error}</FormMessage> : null}
        <form id={deleteFormId} action={remove}>
          <input type="hidden" name="groupId" value={group.id} />
        </form>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive" disabled={deletePending}>
              <Trash2 className="size-4" />
              {deletePending ? "Deleting…" : "Delete group"}
            </Button>
          }
          title={`Delete group "${group.name}"?`}
          description={`The group and its ${group.memberCount} ${group.memberCount === 1 ? "membership" : "memberships"} are deleted permanently. No organization is deleted — memberships only.`}
          confirmLabel="Delete group"
          confirmForm={deleteFormId}
          disabled={deletePending}
        />
      </CardContent>
    </Card>
  );
}

function MembersCard({
  group,
  members,
  groupableOrgs,
}: {
  group: AdminGroupRow;
  members: AdminGroupMemberRow[];
  groupableOrgs: AdminGroupableOrg[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AddMemberForm groupId={group.id} groupableOrgs={groupableOrgs} />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell className="text-muted-foreground py-8 text-center" colSpan={4}>
                  No organizations in this group yet.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <MemberRow key={member.organizationId} groupId={group.id} member={member} />
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AddMemberForm({
  groupId,
  groupableOrgs,
}: {
  groupId: string;
  groupableOrgs: AdminGroupableOrg[];
}) {
  const [state, action, pending] = useActionState(addOrgToGroupAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3" noValidate>
      <input type="hidden" name="groupId" value={groupId} />
      <div className="flex min-w-64 flex-col gap-1.5">
        <Label id="add-org-label">Organization</Label>
        <Select name="organizationId" aria-labelledby="add-org-label">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Pick an organization…" />
          </SelectTrigger>
          <SelectContent>
            {groupableOrgs.length === 0 ? (
              <SelectItem value="__none" disabled>
                No organizations left to add
              </SelectItem>
            ) : (
              groupableOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name} ({org.status})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending || groupableOrgs.length === 0}>
        <UserPlus className="size-4" />
        {pending ? "Adding…" : "Add to group"}
      </Button>
      {state.error ? <FormMessage className="w-full">{state.error}</FormMessage> : null}
    </form>
  );
}

function MemberRow({ groupId, member }: { groupId: string; member: AdminGroupMemberRow }) {
  const [state, action, pending] = useActionState(removeOrgFromGroupAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [state, router]);

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/admin/organizations/${member.organizationId}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {member.orgName}
        </Link>
        <div className="text-muted-foreground text-xs">/{member.orgSlug}</div>
      </TableCell>
      <TableCell>
        <OrgStatusBadge status={member.orgStatus} />
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        <time dateTime={member.createdAt.toISOString()}>
          {member.createdAt.toISOString().slice(0, 10)}
        </time>
      </TableCell>
      <TableCell className="text-right">
        <form action={action}>
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="organizationId" value={member.organizationId} />
          <Button type="submit" variant="ghost" size="sm" disabled={pending}>
            <UserRoundMinus className="size-4" />
            {pending ? "Removing…" : "Remove"}
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}