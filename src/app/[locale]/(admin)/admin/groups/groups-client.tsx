"use client";

import { useActionState, useEffect, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

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
import { createClientGroupAction, deleteClientGroupAction } from "@/features/admin/groups-actions";
import type { AdminGroupRow } from "@/features/admin/groups";

const initial: FormState = {};

export function GroupsClient({ initialGroups }: { initialGroups: AdminGroupRow[] }) {
  return (
    <div className="space-y-8">
      <GroupCreateCard />
      <GroupsTable groups={initialGroups} />
    </div>
  );
}

function GroupCreateCard() {
  const [state, action, pending] = useActionState(createClientGroupAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New group</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4" noValidate>
          <FormField label="Name" htmlFor="group-name">
            <Input id="group-name" name="name" required placeholder="e.g. Enterprise accounts" />
          </FormField>
          <FormField label="Description" htmlFor="group-description">
            <Textarea id="group-description" name="description" rows={2} placeholder="Optional" />
          </FormField>
          {state.error ? <FormMessage>{state.error}</FormMessage> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" />
              {pending ? "Creating…" : "Create group"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function GroupsTable({ groups }: { groups: AdminGroupRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Members</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.length === 0 ? (
          <TableRow>
            <TableCell className="text-muted-foreground py-8 text-center" colSpan={4}>
              No client groups yet. Create the first one above.
            </TableCell>
          </TableRow>
        ) : (
          groups.map((group) => <GroupRow key={group.id} group={group} />)
        )}
      </TableBody>
    </Table>
  );
}

function GroupRow({ group }: { group: AdminGroupRow }) {
  const [deleteState, remove, deletePending] = useActionState(deleteClientGroupAction, initial);
  const router = useRouter();
  const deleteFormId = useId();

  useEffect(() => {
    if (deleteState.success) {
      toast.success(deleteState.success);
      router.refresh();
    }
  }, [deleteState, router]);

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/admin/groups/${group.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {group.name}
        </Link>
        <div className="text-muted-foreground text-xs">/{group.slug}</div>
        {group.description ? (
          <div className="text-muted-foreground mt-1 text-xs">{group.description}</div>
        ) : null}
      </TableCell>
      <TableCell>{group.memberCount}</TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap">
        <time dateTime={group.createdAt.toISOString()}>
          {group.createdAt.toISOString().slice(0, 10)}
        </time>
      </TableCell>
      <TableCell className="text-right">
        {deleteState.error ? (
          <div className="mb-1">
            <FormMessage className="text-xs">{deleteState.error}</FormMessage>
          </div>
        ) : null}
        <form id={deleteFormId} action={remove}>
          <input type="hidden" name="groupId" value={group.id} />
        </form>
        <ConfirmDialog
          trigger={
            <Button type="button" variant="ghost" size="sm" disabled={deletePending}>
              <Trash2 className="size-4" />
            </Button>
          }
          title={`Delete group "${group.name}"?`}
          description={`The group and its ${group.memberCount} ${group.memberCount === 1 ? "membership" : "memberships"} are deleted permanently. No organization is deleted — memberships only.`}
          confirmLabel="Delete group"
          confirmForm={deleteFormId}
          disabled={deletePending}
        />
      </TableCell>
    </TableRow>
  );
}